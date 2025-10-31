<template>
  <section class="guide card">
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
  </section>
</template>

<script setup lang="ts">
import { t } from '../i18n'
</script>

<style scoped>
.guide {
  padding: var(--spacing-lg);
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
.guide__list li { margin: 6px 0; line-height: 1.6; }

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
.guide__steps li { margin: 4px 0; }

@media (max-width: 480px) {
  .guide { padding: var(--spacing-md); }
  .guide__title { font-size: 20px; }
  .guide__subtitle { font-size: 15px; }
  .guide__tagline { font-size: 13px; }
}
</style>


