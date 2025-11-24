const DEFAULT_MAX_PULL = 110;
const TRANSITION = 'transform 240ms cubic-bezier(0.33, 1, 0.68, 1)';

interface ElasticScrollOptions {
	maxPull?: number;
	target?: HTMLElement | null;
	scrollElement?: HTMLElement | null;
}

const isTouchDevice = () => {
	if (typeof window === 'undefined') return false;
	return (
		'ontouchstart' in window ||
		navigator.maxTouchPoints > 0 ||
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		((navigator as any).msMaxTouchPoints && (navigator as any).msMaxTouchPoints > 0)
	);
};

const prefersCoarsePointer = () => {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
	try {
		return window.matchMedia('(pointer: coarse)').matches;
	} catch {
		return false;
	}
};

export function useElasticScroll(options: ElasticScrollOptions = {}) {
	if (typeof window === 'undefined' || !isTouchDevice()) {
		return () => {};
	}

	// 仅在移动端或粗指针设备启用
	if (!prefersCoarsePointer()) {
		return () => {};
	}

	const scrollEl = options.scrollElement ?? document.scrollingElement ?? document.documentElement;
	const targetEl = options.target ?? document.getElementById('app') ?? document.body;

	if (!scrollEl || !targetEl) {
		return () => {};
	}

	let startY = 0;
	let pulling = false;
	let raf = 0;
	let currentOffset = 0;
	const maxPull = options.maxPull ?? DEFAULT_MAX_PULL;

	const setTransform = (value: number, withTransition = false) => {
		if (!targetEl) return;
		currentOffset = value;
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			targetEl.style.willChange = 'transform';
			targetEl.style.transition = withTransition ? TRANSITION : 'none';
			targetEl.style.transform = value === 0 ? 'translate3d(0, 0, 0)' : `translate3d(0, ${value}px, 0)`;
			targetEl.classList.toggle('elastic-scroll-active', value !== 0);
		});
	};

	const onTouchStart = (evt: TouchEvent) => {
		if (evt.touches.length !== 1) return;
		const touch = evt.touches[0];
		if (!touch) return;
		
		// 如果当前有未完成的动画回弹，立即取消并重置状态
		if (currentOffset !== 0) {
			setTransform(0, false);
			pulling = false;
		}
		
		startY = touch.clientY;
		pulling = false; // 确保每次触摸都从干净的状态开始
	};

	const applyResistance = (delta: number) => {
		const direction = delta > 0 ? 1 : -1;
		const distance = Math.abs(delta);
		const resisted = Math.min(maxPull, Math.pow(distance, 0.9));
		return resisted * direction;
	};

	const onTouchMove = (evt: TouchEvent) => {
		if (evt.touches.length !== 1) return;
		const touch = evt.touches[0];
		if (!touch) return;
		
		// 如果当前有未完成的动画回弹，先重置状态，避免状态冲突
		if (currentOffset !== 0 && !pulling) {
			setTransform(0, false);
		}
		
		const touchY = touch.clientY;
		const deltaY = touchY - startY;
		const scrollTop = scrollEl.scrollTop;
		const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
		const atTop = scrollTop <= 0;
		const atBottom = scrollTop >= maxScrollTop;
		const noScrollableContent = maxScrollTop === 0;

		// 只有在真正需要下拉/上拉弹性效果时才阻止默认滚动
		if ((atTop && deltaY > 0) || ((atBottom || noScrollableContent) && deltaY < 0)) {
			const offset = applyResistance(deltaY);
			setTransform(offset, false);
			pulling = true;
			evt.preventDefault();
			return;
		}

		// 如果之前处于下拉状态，但现在不满足下拉条件，重置状态并允许正常滚动
		if (pulling) {
			pulling = false;
			setTransform(0, false);
		}
	};

	const onTouchEnd = () => {
		// 无论什么情况，都确保 pulling 状态被重置
		pulling = false;
		
		// 只有在有偏移量时才触发回弹动画
		if (currentOffset !== 0) {
			setTransform(0, true);
		}
	};

	document.addEventListener('touchstart', onTouchStart, { passive: true });
	document.addEventListener('touchmove', onTouchMove, { passive: false });
	document.addEventListener('touchend', onTouchEnd, { passive: true });
	document.addEventListener('touchcancel', onTouchEnd, { passive: true });

	const cleanup = () => {
		document.removeEventListener('touchstart', onTouchStart);
		document.removeEventListener('touchmove', onTouchMove);
		document.removeEventListener('touchend', onTouchEnd);
		document.removeEventListener('touchcancel', onTouchEnd);
		cancelAnimationFrame(raf);
		if (targetEl) {
			targetEl.style.transition = '';
			targetEl.style.transform = '';
			targetEl.style.willChange = '';
			targetEl.classList.remove('elastic-scroll-active');
		}
	};

	return cleanup;
}

