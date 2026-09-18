"use strict";

function commandTypeAl(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

class RuntimeCommandRouter {
  constructor(options = {}) {
    this.name =
      typeof options.name === "string" &&
      options.name.trim()
        ? options.name.trim()
        : "runtime";

    this.logger =
      options.logger || console;

    this.mutationExecutor =
      typeof options.mutationExecutor === "function"
        ? options.mutationExecutor
        : null;

    this.idempotencyExecutor =
      typeof options.idempotencyExecutor === "function"
        ? options.idempotencyExecutor
        : null;

    this.authoritativeMutationExecutor =
      typeof options.authoritativeMutationExecutor === "function"
        ? options.authoritativeMutationExecutor
        : null;

    this._routes = new Map();
    this._metrics = new Map();
  }

  register(type, handler, options = {}) {
    const normalized = commandTypeAl(type);

    if (!normalized) {
      throw new Error(
        "Command type bos ola bilmez."
      );
    }

    if (typeof handler !== "function") {
      throw new Error(
        "Command handler funksiya olmalidir: " +
        normalized
      );
    }

    if (this._routes.has(normalized)) {
      throw new Error(
        "Command artiq qeydiyyatdan kecib: " +
        normalized
      );
    }

    this._routes.set(normalized, {
      handler,
      authRequired:
        options.authRequired === true,
      mutation:
        options.mutation === true,
      postgresAuthoritative:
        options.postgresAuthoritative === true
    });

    this._metrics.set(normalized, {
      received: 0,
      succeeded: 0,
      failed: 0,
      lastDurationMs: 0
    });

    return this;
  }

  has(type) {
    return this._routes.has(
      commandTypeAl(type)
    );
  }

  listRoutes() {
    return Array.from(
      this._routes.keys()
    ).sort();
  }

  getMetrics() {
    const result = {};

    for (
      const [type, metrics] of
      this._metrics
    ) {
      result[type] = {
        ...metrics
      };
    }

    return result;
  }

  async dispatch(context = {}) {
    const type = commandTypeAl(
      context.type ||
      context.msg?.type
    );

    if (!type) {
      return false;
    }

    const route =
      this._routes.get(type);

    if (!route) {
      return false;
    }

    const metrics =
      this._metrics.get(type);

    metrics.received += 1;

    const startedAt =
      process.hrtime.bigint();

    try {
      if (
        route.authRequired &&
        !context.ws?._authedPlayerId
      ) {
        if (
          typeof context.send ===
          "function"
        ) {
          context.send(
            context.ws,
            {
              type: "error",
              code: "NOT_AUTHED",
              message: "Not authed"
            }
          );
        }

        metrics.succeeded += 1;
        return true;
      }

      const handlerContext = {
        ...context,
        type
      };

      if (
        route.mutation &&
        this.mutationExecutor
      ) {
        const playerId =
          context.ws &&
          context.ws._authedPlayerId
            ? String(
                context.ws._authedPlayerId
              )
            : "";

        const selectedExecutor =
          route.postgresAuthoritative &&
          this.authoritativeMutationExecutor
            ? this.authoritativeMutationExecutor
            : this.mutationExecutor;

        await selectedExecutor(
          playerId,
          async (
            mutationRuntime = {}
          ) => {
            const mutationSend =
              typeof mutationRuntime.send === "function"
                ? mutationRuntime.send
                : context.send;

            const transactionContext =
              mutationRuntime &&
              mutationRuntime.transactionContext
                ? mutationRuntime.transactionContext
                : null;

            const deferAfterCommit =
              typeof mutationRuntime.deferAfterCommit === "function"
                ? mutationRuntime.deferAfterCommit
                : async (callback) => {
                    if (
                      typeof callback ===
                      "function"
                    ) {
                      await callback();
                      return true;
                    }

                    return false;
                  };

            if (
              this.idempotencyExecutor
            ) {
              return await this.idempotencyExecutor({
                playerId,
                type,
                msg:
                  context.msg || {},
                ws:
                  context.ws,
                send:
                  mutationSend,
                execute:
                  async (
                    sendOverride
                  ) =>
                    await route.handler({
                      ...handlerContext,
                      send:
                        sendOverride ||
                        mutationSend,
                      transactionContext,
                      deferAfterCommit
                    })
              });
            }

            return await route.handler({
              ...handlerContext,
              send:
                mutationSend,
              transactionContext,
              deferAfterCommit
            });
          },
          {
            type,
            msg:
              context.msg || {},
            ws:
              context.ws,
            send:
              context.send
          }
        );
      }
      else {
        await route.handler(
          handlerContext
        );
      }

      metrics.succeeded += 1;
      return true;
    }
    catch (error) {
      metrics.failed += 1;

      try {
        this.logger.error(
          "[COMMAND_ROUTER] Handler error:",
          {
            router: this.name,
            type,
            playerId:
              context.ws?._authedPlayerId ||
              null,
            message:
              error && error.message
                ? error.message
                : String(error)
          }
        );
      }
      catch (_) {
      }

      if (
        typeof context.send ===
        "function"
      ) {
        context.send(
          context.ws,
          {
            type: "error",
            code:
              "COMMAND_HANDLER_FAILED",
            message:
              "Server command error"
          }
        );
      }

      return true;
    }
    finally {
      const endedAt =
        process.hrtime.bigint();

      metrics.lastDurationMs =
        Number(
          endedAt - startedAt
        ) / 1_000_000;
    }
  }
}

module.exports = {
  RuntimeCommandRouter,
  commandTypeAl
};
