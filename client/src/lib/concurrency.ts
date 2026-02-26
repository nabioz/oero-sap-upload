type Task<T> = () => Promise<T>;

type ConcurrencyOptions = {
    concurrency: number;
};

export async function runWithConcurrency<T>(
    tasks: Task<T>[],
    options: ConcurrencyOptions,
    onTaskComplete?: (index: number, result: T) => void,
): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < tasks.length) {
            const i = nextIndex++;
            const result = await tasks[i]();
            results[i] = result;
            onTaskComplete?.(i, result);
        }
    }

    const workers = Array.from(
        { length: Math.min(options.concurrency, tasks.length) },
        () => worker(),
    );

    await Promise.all(workers);
    return results;
}
