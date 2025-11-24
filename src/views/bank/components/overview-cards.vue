<template>
	<div class="overview-container">
		<div class="overview-card" v-for="(item, index) in props.cards" :key="item.label + index">
			<!-- 波浪动画 -->
			<canvas class="wave-canvas" :ref="(el) => registerCanvas(el, index)"></canvas>
			<p class="card-value">{{ item.value }}</p>
			<p class="card-label">{{ item.label }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import type { ComponentPublicInstance } from 'vue';

// 定义 props
interface Card {
	value: string;
	label: string;
}

interface Props {
	cards: Card[];
}

const props = defineProps<Props>();

// 波浪动画层
type WaveLayer = {
	amplitude: number;
	wavelength: number;
	speed: number;
	baselineRatio: number;
	colors: [string, string];
	opacity: number;
	phaseOffset: number;
};

// 波浪动画控制器
type WaveController = {
	destroy: () => void;
};

// 波浪动画控制器集合
const waveControllers = new Map<number, WaveController>();

// 注册波浪动画
const registerCanvas = (el: Element | ComponentPublicInstance | null, index: number) => {
	const canvas = (el as HTMLCanvasElement | null) ?? null;
	const existing = waveControllers.get(index);

	if (!canvas) {
		existing?.destroy();
		waveControllers.delete(index);
		return;
	}

	if (existing) {
		return;
	}

	// 使用 requestAnimationFrame 确保 DOM 完全渲染后再初始化
	requestAnimationFrame(() => {
		// 再次使用 requestAnimationFrame 确保尺寸计算准确
		requestAnimationFrame(() => {
			const instance = createWaveAnimation(canvas);
			if (instance) {
				waveControllers.set(index, instance);
			}
		});
	});
};

// 创建波浪动画
const createWaveAnimation = (canvas: HTMLCanvasElement): WaveController | null => {
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return null;
	}
	let dpr = window.devicePixelRatio || 1;
	let viewWidth = 0;
	let viewHeight = 0;
	// 波浪动画层配置
	const waveLayers: WaveLayer[] = [
		{
			amplitude: 24, // 振幅
			wavelength: 80, // 波长
			speed: 0.6, // 速度
			baselineRatio: 0.56, // 基准比例
			colors: ['rgba(255, 176, 59, 0.4)', 'rgba(255, 255, 255, 0.1)'], // 颜色
			opacity: 0.8, // 透明度
			phaseOffset: 0, // 相位偏移
		},
		{
			amplitude: 20,
			wavelength: 100,
			speed: 0.9,
			baselineRatio: 0.63,
			colors: ['rgba(255, 176, 59, 0.4)', 'rgba(255, 255, 255, 0.08)'],
			opacity: 0.8,
			phaseOffset: Math.PI / 3,
		},
	];

	// 调整画布大小
	const resizeCanvas = () => {
		const parent = canvas.parentElement;
		if (!parent) return;
		
		// 使用 offsetWidth 和 offsetHeight 获取包含 padding 的实际尺寸
		// 这样可以确保 canvas 完全覆盖父元素，包括 padding 区域
		const width = parent.offsetWidth;
		const height = parent.offsetHeight;

		if (!width || !height) {
			return;
		}

		dpr = window.devicePixelRatio || 1;
		viewWidth = width;
		viewHeight = height;

		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(dpr, dpr);
	};

	// 绘制波浪动画层
	const drawWaveLayer = (layer: WaveLayer, time: number) => {
		if (!viewWidth || !viewHeight) return;

		const baseline = viewHeight * layer.baselineRatio;
		ctx.beginPath();
		ctx.moveTo(0, viewHeight);
		ctx.lineTo(0, baseline);

		for (let x = 0; x <= viewWidth; x += 2) {
			const theta = x / layer.wavelength + time * layer.speed + layer.phaseOffset;
			const y = baseline + Math.sin(theta) * layer.amplitude;
			ctx.lineTo(x, y);
		}

		ctx.lineTo(viewWidth, viewHeight);
		ctx.closePath();

		const gradient = ctx.createLinearGradient(0, baseline - layer.amplitude, 0, viewHeight);
		gradient.addColorStop(0, layer.colors[0]);
		gradient.addColorStop(1, layer.colors[1]);
		ctx.globalAlpha = layer.opacity;
		ctx.fillStyle = gradient;
		ctx.fill();
		ctx.globalAlpha = 1;
	};

	let animationId = 0;
	let phase = 0;

	const render = () => {
		animationId = window.requestAnimationFrame(render);
		phase += 0.012;

		if (!viewWidth || !viewHeight) return;
		ctx.clearRect(0, 0, viewWidth, viewHeight);
		waveLayers.forEach((layer, index) => drawWaveLayer(layer, phase + index * 0.5));
	};

	resizeCanvas();
	render();

	const handleResize = () => {
		// 使用 requestAnimationFrame 确保在布局更新后重新计算尺寸
		requestAnimationFrame(() => {
			resizeCanvas();
		});
	};

	window.addEventListener('resize', handleResize, { passive: true });

	// 保存 ResizeObserver 引用以便清理
	let resizeObserverInstance: ResizeObserver | null = null;
	if (canvas.parentElement) {
		resizeObserverInstance = new ResizeObserver(() => {
			resizeCanvas();
		});
		resizeObserverInstance.observe(canvas.parentElement);
	}

	return {
		destroy: () => {
			window.cancelAnimationFrame(animationId);
			window.removeEventListener('resize', handleResize);
			if (resizeObserverInstance && canvas.parentElement) {
				resizeObserverInstance.unobserve(canvas.parentElement);
				resizeObserverInstance.disconnect();
			}
		},
	};
};

// 卸载波浪动画
onBeforeUnmount(() => {
	waveControllers.forEach((controller) => controller.destroy());
	waveControllers.clear();
});
</script>

<style scoped lang="less">
// 总揽卡片
.overview-container {
	display: flex;
	flex-direction: row;
	gap: 16px;
	width: 100%;
	flex-wrap: wrap;
	align-items: stretch;
}

.overview-card {
	display: flex;
	flex-direction: column;
	gap: 6px;
	justify-content: flex-end;
	align-items: flex-start;
	box-sizing: border-box;
	flex: 1 1 calc(50% - 8px);
	min-width: 240px;
	height: 88px;
	padding: 12px 20px 16px;
	border-radius: 8px;
	box-shadow: 0px 0px 20px 0px rgba(241,241,241,1);
	position: relative;
	background: #ffffff;
}

// 波浪动画
.wave-canvas {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	border-radius: inherit;
	pointer-events: none;
	z-index: 0;
	// 确保 canvas 完全覆盖父元素，包括 padding 区域
	box-sizing: border-box;
}

// 卡片内容
.overview-card > * {
	z-index: 1;
}

.card-value {
	font-family: DemoItalicBold;
	margin: 0;
	font-size: 24px;
	letter-spacing: 1.33px;
	font-weight: 900;
	line-height: 1.1;
}

.card-label {
	margin: 0;
	font-size: 12px;
	color: #00000030;
	font-family: PingFangSC-Semibold;
	font-weight: 600;
}

@media (max-width: 768px) {
	.overview-card {
		flex: 1 1 100%;
		min-width: 100%;
	}
}
</style>
