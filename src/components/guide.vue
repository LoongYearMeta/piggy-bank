<template>
	<section class="guide card">
		<button
			id="tour-guide-toggle"
			type="button"
			class="guide__toggle"
			@click="isOpen = !isOpen"
			:aria-expanded="isOpen"
		>
			<span>{{ t('guide_toggle_label') }}</span>
			<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true" :class="{ rotate: isOpen }">
				<path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z" />
			</svg>
		</button>

		<Transition name="guide-collapse">
			<div v-if="isOpen" class="guide__body">
				<header class="guide__header">
					<h2 class="guide__title">{{ t('guide_title') }}</h2>
					<p class="guide__tagline">{{ t('guide_tagline') }}</p>
				</header>

				<div class="guide__content">
					<h3 class="section-title">{{ t('guide_section_flow') }}</h3>

					<div class="guide__block">
						<h4 class="guide__subtitle">{{ t('guide_how_deposit') }}</h4>
						<ul class="guide__list">
							<li>{{ t('guide_home_info') }}</li>
							<li>{{ t('guide_click_get_address') }}</li>
							<li>
								<div class="guide__steps-title">{{ t('guide_deposit_steps_title') }}</div>
								<ul class="guide__steps">
									<li>{{ t('guide_step1_amount') }}</li>
									<li>{{ t('guide_step2_term') }}</li>
									<li>{{ t('guide_step3_submit') }}</li>
								</ul>
							</li>
						</ul>
					</div>

					<div class="guide__block">
						<h4 class="guide__subtitle">{{ t('guide_how_withdraw') }}</h4>
						<ul class="guide__list">
							<li>{{ t('guide_withdraw_nav') }}</li>
							<li>{{ t('guide_withdraw_pick') }}</li>
						</ul>
					</div>

					<h3 class="section-title">{{ t('guide_section_notice') }}</h3>
					<ul class="guide__list guide__list--notice">
						<li>{{ t('guide_notice_wallet') }}</li>
						<li>{{ t('guide_notice_term') }}</li>
						<li>{{ t('guide_notice_maturity') }}</li>
						<li>{{ t('guide_notice_refresh') }}</li>
					</ul>
				</div>

				<div class="guide__footer">
					<button type="button" class="btn btn--pill" @click="$emit('restart-onboarding')">
						{{ locale === 'zh' ? '重新查看新手引导' : 'Show onboarding again' }}
					</button>
				</div>
			</div>
		</Transition>
	</section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { t, locale } from '../i18n';

defineEmits<{ (e: 'restart-onboarding'): void }>();

const isOpen = ref(false);

function close() {
	isOpen.value = false;
}

defineExpose({ close });
</script>

<style scoped>
.guide {
	padding: var(--spacing-lg);
}

.guide__toggle {
	appearance: none;
	-webkit-appearance: none;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 12px 14px;
	border-radius: var(--radius-lg);
	border: 1px solid #e5e7eb;
	background: #ffffff;
	color: var(--color-text-primary);
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	box-shadow: var(--shadow-sm);
}
.guide__toggle:hover {
	transform: translateY(-1px);
	box-shadow: var(--shadow-md);
}
.guide__toggle:active {
	transform: translateY(0);
}

.chevron {
	width: 18px;
	height: 18px;
	color: #666;
	transition: transform 0.2s ease;
}
.chevron.rotate {
	transform: rotate(180deg);
}

.guide__body {
	margin-top: 12px;
	overflow: hidden;
}

.guide__header {
	text-align: center;
	margin-bottom: 10px;
}
.guide__title {
	margin: 0;
	color: var(--color-text-primary);
	font-size: 22px;
	font-weight: 700;
}
.guide__tagline {
	margin: 6px 0 0 0;
	color: var(--color-text-secondary);
	font-size: 14px;
}

.guide__content {
	margin-top: 12px;
	text-align: left;
}

.guide__block {
	background: rgba(255, 255, 255, 0.9);
	border: 1px solid rgba(0, 0, 0, 0.04);
	border-radius: var(--radius-md);
	padding: 12px 14px;
	margin-bottom: 12px;
}

.guide__subtitle {
	margin: 0 0 6px 0;
	color: var(--color-text-primary);
	font-size: 16px;
}
.guide__list {
	margin: 0;
	padding-left: 18px;
	color: var(--color-text-primary);
}
.guide__list li {
	margin: 6px 0;
	line-height: 1.6;
}
.guide__list--notice {
	padding-left: 18px;
}
.guide__steps-title {
	color: var(--color-text-primary);
	margin: 6px 0 2px 0;
}
.guide__steps {
	padding-left: 18px;
	margin: 0;
}
.guide__steps li {
	margin: 4px 0;
}

.guide__footer {
	text-align: center;
	margin-top: 10px;
}

/* Collapse animation: smooth height + opacity */
.guide-collapse-enter-from,
.guide-collapse-leave-to {
	max-height: 0;
	opacity: 0;
}
.guide-collapse-enter-active,
.guide-collapse-leave-active {
	transition:
		max-height 500ms ease,
		opacity 600ms ease;
}
.guide-collapse-enter-to,
.guide-collapse-leave-from {
	max-height: 1200px; /* 足够覆盖内容高度 */
	opacity: 1;
}

@media (max-width: 480px) {
	.guide {
		padding: var(--spacing-md);
	}
	.guide__title {
		font-size: 20px;
	}
	.guide__subtitle {
		font-size: 15px;
	}
	.guide__tagline {
		font-size: 13px;
	}
}
</style>
