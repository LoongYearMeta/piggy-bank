<template>
	<Teleport to="body">
		<div
			v-if="open"
			class="ob-overlay"
			:class="{ 'ob-overlay--dim': isGlobalDim }"
			@click.self="handleSkip"
			role="dialog"
			aria-modal="true"
		>
			<!-- Spotlight highlight -->
			<div v-if="currentRect" class="ob-spotlight" :style="spotlightStyle"></div>

			<!-- Tooltip/card with step transition -->
			<Transition name="ob-step" mode="out-in">
				<div class="ob-card" :style="cardStyle" ref="cardRef" :key="stepIndex">
					<div class="ob-card__content">
						<h3 class="ob-card__title">{{ activeTitle }}</h3>
						<p class="ob-card__desc" v-if="!isLangStep && !isAskStep">{{ activeDesc }}</p>
						<div v-if="isAskStep" class="ob-ask">
							<button type="button" class="btn btn--next" @click="next">{{ t('tour_yes') }}</button>
							<button type="button" class="btn" @click="handleSkip">{{ t('tour_no') }}</button>
						</div>
						<div v-if="isLangStep" class="ob-lang">
							<button type="button" class="btn" @click="chooseLang('zh')">
								{{ t('tour_lang_zh') }}
							</button>
							<button type="button" class="btn" @click="chooseLang('en')">
								{{ t('tour_lang_en') }}
							</button>
						</div>
					</div>
					<div class="ob-card__actions">
						<button type="button" class="btn" @click="handleSkip">{{ t('tour_skip') }}</button>
						<div class="spacer"></div>
						<button type="button" class="btn" v-if="stepIndex > 0 && !isAskStep" @click="prev">
							{{ t('tour_prev') }}
						</button>
						<button
							type="button"
							class="btn btn--next"
							@click="next"
							v-if="!isLangStep && !isAskStep"
						>
							{{ isLast ? t('tour_finish') : t('tour_next') }}
						</button>
					</div>
				</div>
			</Transition>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { t, setLocale, type Locale } from '../i18n';

interface StepConfig {
	titleKey: string;
	descKey: string;
	targetId?: string; // optional spotlight target
}

const props = defineProps<{
	steps: StepConfig[];
	storageKey?: string;
}>();

const storageKey = computed(() => props.storageKey || 'onboarding_v1_done');

const open = ref(false);
const stepIndex = ref(0);
const currentRect = ref<DOMRect | null>(null);
const cardRef = ref<HTMLElement | null>(null);

const activeStep = computed(
	() => props.steps[Math.min(stepIndex.value, Math.max(0, props.steps.length - 1))],
);
const activeTitle = computed(() => t(activeStep.value?.titleKey || ''));
const activeDesc = computed(() => t(activeStep.value?.descKey || ''));
const isLangStep = computed(() => activeStep.value?.titleKey === 'tour_lang_title');
const isAskStep = computed(() => activeStep.value?.titleKey === 'tour_ask_title');
const isLast = computed(() => stepIndex.value >= props.steps.length - 1);
const isGlobalDim = computed(() => !activeStep.value?.targetId);

function calcRect() {
	const id = activeStep.value?.targetId;
	if (!id) {
		currentRect.value = null;
		positionCardCenter();
		return;
	}
	const el = document.getElementById(id);
	if (!el) {
		currentRect.value = null;
		positionCardCenter();
		return;
	}
	const rect = el.getBoundingClientRect();
	currentRect.value = rect;
	ensureInView(el);
	positionCardNear(rect);
}

function ensureInView(el: Element) {
	try {
		(el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
	} catch {}
}

function positionCardNear(rect: DOMRect) {
	// Prefer below; fallback above
	const margin = 12;
	const topBelow = rect.bottom + margin;
	const topAbove = rect.top - margin;
	const left = Math.max(12, Math.min(rect.left, window.innerWidth - 340 - 12));
	const card = cardRef.value;
	const cardH = card ? card.offsetHeight : 160;
	const canPlaceBelow = rect.bottom + margin + cardH < window.innerHeight;
	cardTop.value = canPlaceBelow ? topBelow : Math.max(12, topAbove - cardH);
	cardLeft.value = left;
}

function positionCardCenter() {
	const w = 340;
	cardLeft.value = (window.innerWidth - w) / 2;
	cardTop.value = Math.max(24, window.innerHeight * 0.18);
}

const cardTop = ref(0);
const cardLeft = ref(0);

const spotlightStyle = computed(() => {
	if (!currentRect.value) return { display: 'none' };
	const r = currentRect.value;
	return {
		top: `${r.top - 6}px`,
		left: `${r.left - 6}px`,
		width: `${r.width + 12}px`,
		height: `${r.height + 12}px`,
	} as Record<string, string>;
});

const cardStyle = computed(() => ({ top: cardTop.value + 'px', left: cardLeft.value + 'px' }));

function openTour(startAt = 0) {
	stepIndex.value = startAt;
	open.value = true;
	nextTick(calcRect);
}

function closeTour(done = false) {
	open.value = false;
	if (done) {
		try {
			localStorage.setItem(storageKey.value, '1');
		} catch {}
	}
}

function next() {
	if (isLast.value) {
		closeTour(true);
		return;
	}
	stepIndex.value += 1;
	nextTick(calcRect);
}

function prev() {
	if (stepIndex.value <= 0) return;
	stepIndex.value -= 1;
	nextTick(calcRect);
}

function handleSkip() {
	closeTour(true);
}

function chooseLang(l: Locale) {
	try {
		setLocale(l);
	} catch {}
	next();
}

function onWinChange() {
	if (!open.value) return;
	calcRect();
}

onMounted(() => {
	window.addEventListener('resize', onWinChange, { passive: true });
	window.addEventListener('scroll', onWinChange, { passive: true });
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', onWinChange);
	window.removeEventListener('scroll', onWinChange);
});

watch(stepIndex, () => nextTick(calcRect));

defineExpose({ open: openTour, close: closeTour, next, prev });
</script>

<style scoped>
.ob-overlay {
	position: fixed;
	inset: 0;
	background: transparent; /* dimming handled by spotlight box-shadow to avoid covering content */
	z-index: 5000;
}
.ob-overlay--dim {
	background: rgba(0, 0, 0, 0.45);
}

.ob-spotlight {
	position: absolute;
	border-radius: 15px;
	box-shadow:
		0 0 0 9999px rgba(0, 0, 0, 0.45),
		0 0 0 2px #409eff inset;
	pointer-events: none;
	transition: all 0.2s ease;
}

.ob-card {
	position: absolute;
	width: 340px;
	background: #fff;
	border-radius: 12px;
	box-shadow: var(--shadow-lg);
	border: 1px solid #eef2f7;
	padding: 14px;
}
.ob-card__title {
	margin: 0 0 6px 0;
	color: var(--color-text-primary);
	font-size: 16px;
	font-weight: 700;
}
.ob-card__desc {
	margin: 0;
	color: var(--color-text-secondary);
	font-size: 14px;
	line-height: 1.6;
}
.ob-card__actions {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 12px;
}
.spacer {
	flex: 1;
}
.ob-lang {
	display: flex;
	gap: 8px;
	margin-top: 8px;
}
.ob-ask {
	display: flex;
	gap: 8px;
	margin-top: 8px;
	justify-content: center;
}

/* Next button uses deposit blue tone */
.btn--next {
	background: var(--blue-100);
	color: #3d3c63;
	border: 1px solid #e5e7eb;
}
.btn--next:hover {
	background: var(--blue-300);
	transform: translateY(-1px);
}

@media (max-width: 480px) {
	.ob-card {
		width: calc(100vw - 24px);
		left: 12px !important;
	}
}

/* Step transition */
.ob-step-enter-from {
	opacity: 0;
	transform: translateY(-6px);
}
.ob-step-enter-active {
	transition: all 160ms ease;
}
.ob-step-enter-to {
	opacity: 1;
	transform: translateY(0);
}
.ob-step-leave-from {
	opacity: 1;
	transform: translateY(0);
}
.ob-step-leave-active {
	transition: all 140ms ease;
}
.ob-step-leave-to {
	opacity: 0;
	transform: translateY(6px);
}
</style>
