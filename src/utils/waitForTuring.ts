type TuringAPI = NonNullable<Window['Turing']>;

type WaitForTuringOptions = {
	timeout?: number;
	pollInterval?: number;
};

let pendingPromise: Promise<TuringAPI> | null = null;

// 等待 Turing 钱包实例
export async function waitForTuring(options: WaitForTuringOptions = {}) {
	if (typeof window === 'undefined') {
		throw new Error('window is undefined');
	}

	const turingInstance = window.Turing as TuringAPI | undefined;
	if (turingInstance) {
		return turingInstance;
	}

	if (pendingPromise) {
		return pendingPromise;
	}

	const { timeout = 15000, pollInterval = 200 } = options;

	pendingPromise = new Promise<TuringAPI>((resolve, reject) => {
		const start = Date.now();
		let timer: number | null = null;

		const cleanup = () => {
			if (timer) {
				window.clearTimeout(timer);
				timer = null;
			}
			window.removeEventListener?.('TuringReady', handleReady as EventListener);
			window.removeEventListener?.('message', handleMessage as EventListener);
			pendingPromise = null;
		};

		const handleResolve = () => {
			const instance = window.Turing as TuringAPI | undefined;
			if (instance) {
				cleanup();
				resolve(instance);
			}
		};

		const handleReady = () => handleResolve();
		const handleMessage = (event: MessageEvent) => {
			if (typeof event.data === 'object' && event.data?.type === 'TURING_WALLET_READY') {
				handleResolve();
			}
		};

		window.addEventListener?.('TuringReady', handleReady as EventListener);
		window.addEventListener?.('message', handleMessage as EventListener);

		const tick = () => {
			const instance = window.Turing as TuringAPI | undefined;
			if (instance) {
				handleResolve();
				return;
			}

			if (Date.now() - start >= timeout) {
				cleanup();
				reject(new Error('Timed out waiting for Turing wallet'));
				return;
			}

			timer = window.setTimeout(tick, pollInterval);
		};

		tick();
	});

	return pendingPromise;
}

