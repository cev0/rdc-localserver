"use strict";

/**
 * Deadline scheduler
 * ------------------------------------------------------------
 * Min-heap ile yalnız aktiv deadline-ları saxlayır.
 * Bütün player-ləri her saniye scan etmir.
 *
 * onDue(playerId) -> nextDueAtMs | null qaytara biler.
 * nextDueAtMs varsa həmin player avtomatik yenidən schedule olunur.
 */

class RuntimeDeadlineScheduler {
  constructor(options = {}) {
    this.onDue =
      typeof options.onDue === "function"
        ? options.onDue
        : async () => null;

    this.now =
      typeof options.now === "function"
        ? options.now
        : () => Date.now();

    this.minDelayMs =
      Math.max(1, Number(options.minDelayMs || 10) || 10);

    this.maxDelayMs =
      Math.max(
        this.minDelayMs,
        Number(options.maxDelayMs || 2147480000) || 2147480000
      );

    this._heap = [];
    this._generation = new Map();
    this._timer = null;
    this._running = false;
    this._stopped = false;
  }

  get size() {
    return this._generation.size;
  }

  schedule(playerId, dueAtMs) {
    const id =
      typeof playerId === "string"
        ? playerId.trim()
        : "";

    const due = Number(dueAtMs);

    if (!id || !Number.isFinite(due) || due <= 0) {
      this.cancel(id);
      return false;
    }

    const generation =
      (this._generation.get(id) || 0) + 1;

    this._generation.set(id, generation);

    this._heapPush({
      playerId: id,
      dueAtMs: due,
      generation
    });

    this._arm();
    return true;
  }

  cancel(playerId) {
    const id =
      typeof playerId === "string"
        ? playerId.trim()
        : "";

    if (!id) {
      return false;
    }

    const existed = this._generation.delete(id);

    if (existed) {
      this._arm();
    }

    return existed;
  }

  stop() {
    this._stopped = true;
    this._generation.clear();
    this._heap.length = 0;

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _isCurrent(entry) {
    return (
      entry &&
      this._generation.get(entry.playerId) === entry.generation
    );
  }

  _discardStaleTop() {
    while (
      this._heap.length > 0 &&
      !this._isCurrent(this._heap[0])
    ) {
      this._heapPop();
    }
  }

  _arm() {
    if (this._stopped || this._running) {
      return;
    }

    this._discardStaleTop();

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (this._heap.length === 0) {
      return;
    }

    const now = this.now();
    const due = this._heap[0].dueAtMs;

    const delay = Math.min(
      this.maxDelayMs,
      Math.max(this.minDelayMs, due - now)
    );

    this._timer = setTimeout(() => {
      this._timer = null;
      void this._drainDue();
    }, delay);

    if (
      this._timer &&
      typeof this._timer.unref === "function"
    ) {
      this._timer.unref();
    }
  }

  async _drainDue() {
    if (this._stopped || this._running) {
      return;
    }

    this._running = true;

    try {
      while (!this._stopped) {
        this._discardStaleTop();

        if (this._heap.length === 0) {
          break;
        }

        const now = this.now();
        const top = this._heap[0];

        if (top.dueAtMs > now) {
          break;
        }

        const entry = this._heapPop();

        if (!this._isCurrent(entry)) {
          continue;
        }

        // Cari generation icra olunur. onDue yeni schedule qaytarmasa
        // bu player artıq aktiv deadline siyahisinda qalmayacaq.
        this._generation.delete(entry.playerId);

        try {
          const nextDueAtMs =
            await this.onDue(entry.playerId);

          if (
            Number.isFinite(Number(nextDueAtMs)) &&
            Number(nextDueAtMs) > 0
          ) {
            this.schedule(
              entry.playerId,
              Number(nextDueAtMs)
            );
          }
        }
        catch (error) {
          console.error(
            "[DEADLINE_SCHEDULER] onDue error:",
            entry.playerId,
            error && error.message ? error.message : error
          );
        }
      }
    }
    finally {
      this._running = false;
      this._arm();
    }
  }

  _heapPush(entry) {
    const heap = this._heap;
    heap.push(entry);

    let index = heap.length - 1;

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);

      if (
        heap[parent].dueAtMs <=
        heap[index].dueAtMs
      ) {
        break;
      }

      [heap[parent], heap[index]] =
        [heap[index], heap[parent]];

      index = parent;
    }
  }

  _heapPop() {
    const heap = this._heap;

    if (heap.length === 0) {
      return null;
    }

    const root = heap[0];
    const last = heap.pop();

    if (heap.length > 0) {
      heap[0] = last;

      let index = 0;

      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;

        if (
          left < heap.length &&
          heap[left].dueAtMs <
            heap[smallest].dueAtMs
        ) {
          smallest = left;
        }

        if (
          right < heap.length &&
          heap[right].dueAtMs <
            heap[smallest].dueAtMs
        ) {
          smallest = right;
        }

        if (smallest === index) {
          break;
        }

        [heap[index], heap[smallest]] =
          [heap[smallest], heap[index]];

        index = smallest;
      }
    }

    return root;
  }
}

module.exports = {
  RuntimeDeadlineScheduler
};
