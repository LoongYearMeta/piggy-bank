<template>
	<div class="form-group">
		<label>存储期限</label>
		<!-- 输入框容器 -->
		<div class="el-time-picker" :class="{ 'is-active': isPanelShow }">
			<div class="el-input form-input" :class="{ 'is-focus': isFocused }">
				<input
					type="text"
					v-model="displayTime"
					placeholder="选择日期时间"
					:class="{ 'error-input': timeError }"
					readonly
					@focus="handleFocus"
					@click="togglePanel"
					@blur="handleBlur"
					class="el-input__inner"
				/>
				<span class="el-input__suffix">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
				</span>
			</div>

			<!-- 弹出面板（日期/时间分离） -->
			<div class="el-picker-panel" v-show="isPanelShow" @click.stop :style="panelPositionStyle">
				<!-- 标签页切换（日期/时间） -->
				<div class="el-tabs">
					<div class="el-tabs__nav">
						<div
							class="el-tabs__item"
							:class="{ 'is-active': activeTab === 'date' }"
							@click="activeTab = 'date'"
						>
							日期
						</div>
						<div
							class="el-tabs__item"
							:class="{ 'is-active': activeTab === 'time' }"
							@click="activeTab = 'time'"
						>
							时间
						</div>
					</div>
					<!-- 日期选择面板 -->
					<div class="el-tab-pane" v-if="activeTab === 'date'">
						<!-- 日期导航 -->
						<div class="el-picker-panel__header">
							<button type="button" class="el-picker-panel__icon-btn" @click="changeMonth(-1)">
								<img src="../assets/arrow-l.svg" alt="左箭头" width="16" height="16" />
							</button>
							<span class="el-picker-panel__label">{{ currentMonthLabel }}</span>
							<button type="button" class="el-picker-panel__icon-btn" @click="changeMonth(1)">
								<img src="../assets/arrow-r.svg" alt="右箭头" width="16" height="16" />
							</button>
						</div>

						<!-- 日期网格 -->
						<div class="el-date-table">
							<div class="el-date-table__header">
								<span v-for="week in weekDays" :key="week" class="el-date-table__cell">{{
									week
								}}</span>
							</div>
							<div class="el-date-table__body">
								<span
									v-for="(day, index) in calendarDays"
									:key="index"
									class="el-date-table__cell"
									:class="{
										'el-date-table__cell--disabled': day.disabled,
										'el-date-table__cell--today': day.isToday,
										'el-date-table__cell--selected': day.isSelected,
									}"
									@click="selectDate(day)"
								>
									{{ day.date.getDate() }}
								</span>
							</div>
						</div>
					</div>

					<!-- 时间选择面板-->
					<div class="el-tab-pane" v-if="activeTab === 'time'">
						<div class="el-time-panel">
							<div class="el-time-panel__content">
								<!-- 时间选择组：每个区域上方加单位 -->
								<div class="time-select-group">
									<!-- 小时选择 -->
									<div class="time-select-item">
										<span class="time-unit">时</span>
										<div
											class="el-time-spinner__wrapper"
											@wheel="(e) => handleTimeScroll(e, 'hour')"
											@touchmove.prevent="handleTouchScroll($event, 'hour')"
										>
											<ul class="el-time-spinner__list" ref="hourList">
												<li
													v-for="h in 24"
													:key="h"
													:class="{ active: h === selectedHour }"
													@click="selectHour(h)"
													:data-hour="h"
												>
													{{ h.toString().padStart(2, '0') }}
												</li>
											</ul>
										</div>
									</div>

									<!-- 分钟选择 -->
									<div class="time-select-item">
										<span class="time-unit">分</span>
										<div
											class="el-time-spinner__wrapper"
											@wheel="(e) => handleTimeScroll(e, 'minute')"
											@touchmove.prevent="handleTouchScroll($event, 'minute')"
										>
											<ul class="el-time-spinner__list" ref="minuteList">
												<li
													v-for="m in 60"
													:key="m"
													:class="{ active: m === selectedMinute }"
													@click="selectMinute(m)"
													:data-minute="m"
												>
													{{ m.toString().padStart(2, '0') }}
												</li>
											</ul>
										</div>
									</div>

									<!-- 秒选择 -->
									<div class="time-select-item">
										<span class="time-unit">秒</span>
										<div
											class="el-time-spinner__wrapper"
											@wheel="(e) => handleTimeScroll(e, 'second')"
											@touchmove.prevent="handleTouchScroll($event, 'second')"
										>
											<ul class="el-time-spinner__list" ref="secondList">
												<li
													v-for="s in 60"
													:key="s"
													:class="{ active: s === selectedSecond }"
													@click="selectSecond(s)"
													:data-second="s"
												>
													{{ s.toString().padStart(2, '0') }}
												</li>
											</ul>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 面板底部按钮 -->
				<div class="el-picker-panel__footer">
					<button type="button" class="el-button el-button--text" @click.stop="confirmSelection">
						确认
					</button>
					<button type="button" class="el-button el-button--text" @click.stop="clearSelection">
						清空
					</button>
				</div>
			</div>
		</div>

		<!-- 错误提示 -->
		<Transition name="error-fade">
			<span class="error-message" v-if="timeError">{{ timeError }}</span>
		</Transition>
		<!-- 区块换算说明 -->
		<div class="block-convert-container">
			<p class="block-convert">区块数换算: 1 区块 = 10 min</p>
			<Transition name="block-fade">
				<p class="block-result" v-if="showBlockCalculation">
					预计区块高度为：{{ calculatedBlockHeight }}
				</p>
			</Transition>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

// 定义props
const props = defineProps<{
	currentBlockHeight: number;
}>();

// 定义emit
const emit = defineEmits<{
	(e: 'update:lockTime', value: number): void;
}>();

const handleLockTimeChange = () => {
	console.log('test-handleLockTimeChange', calculatedBlockHeight.value);
	emit('update:lockTime', calculatedBlockHeight.value); // 发送当前lockTime给父组件
};

// 基础数据
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const isPanelShow = ref(false);
const isFocused = ref(false);
const displayTime = ref('');
const timeError = ref('');
const activeTab = ref('date');

// 区块换算相关
// const currentBlockHeight = ref(0) // 当前区块高度
const calculatedBlockHeight = ref(0); // 计算后的区块高度
const showBlockCalculation = ref(false); // 是否显示区块换算结果

// 选中的时间
const selectedDate = ref<Date>(new Date());
const selectedHour = ref(0);
const selectedMinute = ref(0);
const selectedSecond = ref(0);

// 时间列表Ref
const hourList = ref<HTMLUListElement>();
const minuteList = ref<HTMLUListElement>();
const secondList = ref<HTMLUListElement>();

// 当前显示的月份
const currentMonth = ref(new Date());

// 生成日历数据
const calendarDays = computed(() => {
	const days = [];
	const year = currentMonth.value.getFullYear();
	const month = currentMonth.value.getMonth();
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const firstDayOfWeek = firstDay.getDay();

	// 上月剩余天数
	for (let i = firstDayOfWeek - 1; i >= 0; i--) {
		const day = new Date(year, month, -i);
		days.push({ date: day, disabled: true, isToday: false, isSelected: false });
	}

	// 当月天数
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const selected = new Date(selectedDate.value);
	selected.setHours(0, 0, 0, 0);
	for (let i = 1; i <= lastDay.getDate(); i++) {
		const day = new Date(year, month, i);
		const dayStart = new Date(day);
		dayStart.setHours(0, 0, 0, 0);
		days.push({
			date: day,
			disabled: dayStart < today,
			isToday: dayStart.getTime() === today.getTime(),
			isSelected: dayStart.getTime() === selected.getTime(),
		});
	}

	// 下月补充天数
	const totalDays = 42;
	const remaining = totalDays - days.length;
	for (let i = 1; i <= remaining; i++) {
		const day = new Date(year, month + 1, i);
		days.push({ date: day, disabled: true, isToday: false, isSelected: false });
	}

	return days;
});

// 当前月份显示文本
const currentMonthLabel = computed(() => {
	return `${currentMonth.value.getFullYear()}年${currentMonth.value.getMonth() + 1}月`;
});

// 切换月份
const changeMonth = (step: number) => {
	currentMonth.value = new Date(
		currentMonth.value.getFullYear(),
		currentMonth.value.getMonth() + step,
		1,
	);
};

// 选择日期
const selectDate = (day: { date: Date; disabled: boolean }) => {
	if (day.disabled) return;
	selectedDate.value = new Date(day.date);
	// 无论选择哪个日期，进入时间选择时默认为当前时间
	const now = new Date();
	selectedHour.value = now.getHours();
	selectedMinute.value = now.getMinutes();
	selectedSecond.value = now.getSeconds();
	updateDisplayTime();
	activeTab.value = 'time';
	// 确保时间选择器居中显示
	nextTick(() => {
		scrollToActive('hour');
		scrollToActive('minute');
		scrollToActive('second');
	});
};

// 时间选择：点击选中并滚动到蓝色框中间
const selectHour = (h: number) => {
	selectedHour.value = h;
	updateDisplayTime();
	scrollToActive('hour');
};
const selectMinute = (m: number) => {
	selectedMinute.value = m;
	updateDisplayTime();
	scrollToActive('minute');
};
const selectSecond = (s: number) => {
	selectedSecond.value = s;
	updateDisplayTime();
	scrollToActive('second');
};

// 鼠标滚轮滚动：仅数字列表滚动，蓝色框固定，中间数字为选中项
const handleTimeScroll = (e: WheelEvent, type: 'hour' | 'minute' | 'second') => {
	e.preventDefault();
	const wrapper = e.currentTarget as HTMLDivElement;
	const list =
		type === 'hour' ? hourList.value : type === 'minute' ? minuteList.value : secondList.value;
	if (!list || !wrapper) return;

	const step = e.deltaY > 0 ? 1 : -1; // 每次滚动一个数字
	let newValue = 0;

	if (type === 'hour') {
		newValue = Math.max(0, Math.min(23, selectedHour.value + step));
		selectedHour.value = newValue;
	} else if (type === 'minute') {
		newValue = Math.max(0, Math.min(59, selectedMinute.value + step));
		selectedMinute.value = newValue;
	} else if (type === 'second') {
		newValue = Math.max(0, Math.min(59, selectedSecond.value + step));
		selectedSecond.value = newValue;
	}

	updateDisplayTime();
	// 确保选中项居中显示
	nextTick(() => {
		scrollToActive(type);
	});
};

// 移动端触摸滚动：仅数字列表滚动，蓝色框固定，中间数字为选中项
const handleTouchScroll = (e: TouchEvent, type: 'hour' | 'minute' | 'second') => {
	e.preventDefault();
	const wrapper = e.currentTarget as HTMLDivElement;
	if (!wrapper) return;

	const touch = e.touches[0];
	if (!touch) return;
	const startY = touch.clientY;
	const startValue =
		type === 'hour'
			? selectedHour.value
			: type === 'minute'
				? selectedMinute.value
				: selectedSecond.value;
	const onTouchMove = (e: TouchEvent) => {
		e.preventDefault();
		const touch = e.touches[0];
		if (!touch) return;
		const deltaY = startY - touch.clientY;
		const itemHeight = 36;
		const scrollSteps = Math.round(deltaY / itemHeight);
		let newValue = startValue + scrollSteps;
		// 限制范围
		if (type === 'hour') {
			newValue = Math.max(0, Math.min(23, newValue));
			selectedHour.value = newValue;
		} else if (type === 'minute') {
			newValue = Math.max(0, Math.min(59, newValue));
			selectedMinute.value = newValue;
		} else if (type === 'second') {
			newValue = Math.max(0, Math.min(59, newValue));
			selectedSecond.value = newValue;
		}
		updateDisplayTime();
	};

	const onTouchEnd = () => {
		// 确保选中项居中显示
		nextTick(() => {
			scrollToActive(type);
		});
		document.removeEventListener('touchmove', onTouchMove);
		document.removeEventListener('touchend', onTouchEnd);
	};

	document.addEventListener('touchmove', onTouchMove, { passive: false });
	document.addEventListener('touchend', onTouchEnd);
};

// 选中项居中滚动（确保在蓝色框中间）
const scrollToActive = async (type: 'hour' | 'minute' | 'second') => {
	await nextTick();
	const list =
		type === 'hour' ? hourList.value : type === 'minute' ? minuteList.value : secondList.value;
	const wrapper = list?.parentElement as HTMLDivElement;
	if (!list || !wrapper) return;

	const currentValue =
		type === 'hour'
			? selectedHour.value
			: type === 'minute'
				? selectedMinute.value
				: selectedSecond.value;

	const activeItem = list.querySelector(`[data-${type}="${currentValue}"]`);
	if (!activeItem) return;

	// 计算滚动位置，确保选中项在容器中心
	const wrapperHeight = wrapper.clientHeight;
	const itemHeight = 36;
	const itemTop = (activeItem as HTMLElement).offsetTop;
	const itemCenter = itemTop + itemHeight / 2;
	const wrapperCenter = wrapperHeight / 2;
	const scrollTop = itemCenter - wrapperCenter;

	// 平滑滚动到目标位置
	wrapper.scrollTo({
		top: Math.max(0, scrollTop),
		behavior: 'smooth',
	});
};

// 计算区块高度
const calculateBlockHeight = () => {
	if (!displayTime.value) return;
	const selectedTime = new Date(displayTime.value);
	const currentTime = new Date();
	// 计算时间差（毫秒）
	const timeDiff = selectedTime.getTime() - currentTime.getTime();
	// 转换为分钟
	const timeDiffMinutes = timeDiff / (1000 * 60);
	// 除以10分钟并四舍五入得到需要增加的区块数
	const additionalBlocks = Math.round(timeDiffMinutes / 10);
	// 在默认区块数上增加得到结果
	calculatedBlockHeight.value = props.currentBlockHeight + additionalBlocks;
	showBlockCalculation.value = true;
};

// 确认选择
const confirmSelection = () => {
	const isValid = validateTime();
	if (!isValid) return;
	// 计算区块高度
	calculateBlockHeight();
	// 通知父组件lockTime变化
	handleLockTimeChange();
	// 关闭面板
	isPanelShow.value = false;
	isFocused.value = false;
};

// 清空选择
const clearSelection = () => {
	displayTime.value = '';
	timeError.value = '';
	showBlockCalculation.value = false;
	calculatedBlockHeight.value = 0;
	// 通知父组件lockTime变化
	handleLockTimeChange();
	// 清空后仅关闭面板，不回填当前时间
	isPanelShow.value = false;
	isFocused.value = false;
};

// 更新显示时间（修复回显不一致问题）
const updateDisplayTime = () => {
	// 手动拼接日期时间，避免时区转换问题
	const year = selectedDate.value.getFullYear();
	const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0');
	const day = String(selectedDate.value.getDate()).padStart(2, '0');
	const hour = String(selectedHour.value).padStart(2, '0');
	const minute = String(selectedMinute.value).padStart(2, '0');
	const second = String(selectedSecond.value).padStart(2, '0');
	displayTime.value = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
	validateTime();
};

// 校验时间
const validateTime = () => {
	timeError.value = '';
	if (!displayTime.value) {
		timeError.value = '请先选择完整的日期和时间';
		return false;
	}
	const selected = new Date(displayTime.value);
	const now = new Date();
	now.setMilliseconds(0);
	if (selected < now) {
		timeError.value = '不能选择过去的时间';
		return false;
	}
	return true;
};

// 面板定位样式
const panelPositionStyle = computed(() => {
	if (!isPanelShow.value) return {};
	const inputEl = document.querySelector('.el-input__inner');
	if (!inputEl) return {};
	const rect = inputEl.getBoundingClientRect();
	const panelHeight = 380;
	const canShowAbove = rect.top >= panelHeight;
	return {
		top: canShowAbove ? 'auto' : '100%',
		bottom: canShowAbove ? '100%' : 'auto',
		marginTop: canShowAbove ? '0' : '5px',
		marginBottom: canShowAbove ? '5px' : '0',
	};
});

// 面板显示/隐藏
const togglePanel = () => {
	isPanelShow.value = !isPanelShow.value;
	if (isPanelShow.value) {
		isFocused.value = true;
		activeTab.value = 'date'; // 进入时默认选中日期标签页
		// 设置时间选择默认为当前时间
		const now = new Date();
		selectedHour.value = now.getHours();
		selectedMinute.value = now.getMinutes();
		selectedSecond.value = now.getSeconds();
		updateDisplayTime();
		nextTick(() => {
			scrollToActive('hour');
			scrollToActive('minute');
			scrollToActive('second');
		});
	}
};

// 输入框聚焦/失焦
const handleFocus = () => {
	isFocused.value = true;
};
const handleBlur = () => {
	if (!isPanelShow.value) isFocused.value = false;
};

// 监听屏幕大小变化，确保选中项居中
const handleResize = () => {
	nextTick(() => {
		scrollToActive('hour');
		scrollToActive('minute');
		scrollToActive('second');
	});
};

onMounted(() => {
	const now = new Date();
	selectedHour.value = now.getHours();
	selectedMinute.value = now.getMinutes();
	selectedSecond.value = now.getSeconds();
	updateDisplayTime();
	nextTick(() => {
		scrollToActive('hour');
		scrollToActive('minute');
		scrollToActive('second');
	});
	window.addEventListener('resize', handleResize);
	console.log('currentBlockHeight:', props.currentBlockHeight);
});

onUnmounted(() => {
	window.removeEventListener('resize', handleResize);
});

// 点击外部关闭面板
document.addEventListener('click', (e) => {
	const panel = document.querySelector('.el-picker-panel');
	const input = document.querySelector('.el-input__inner');
	if (panel && input && !panel.contains(e.target as Node) && e.target !== input) {
		isPanelShow.value = false;
		isFocused.value = false;
	}
});

// 设置默认时间（当前时间）
const setDefaultTime = () => {
	const now = new Date();
	const defaultTime = now;
	selectedDate.value = defaultTime;
	selectedHour.value = defaultTime.getHours();
	selectedMinute.value = defaultTime.getMinutes();
	selectedSecond.value = defaultTime.getSeconds();
	updateDisplayTime();
	calculateBlockHeight();
	handleLockTimeChange();
};

// 对外暴露接口
defineExpose({
	getTime: () => displayTime.value,
	validateTime,
	confirmSelection,
	getCalculatedBlockHeight: () => calculatedBlockHeight.value,
	getCurrentBlockHeight: () => props.currentBlockHeight,
	setDefaultTime,
});
</script>

<style scoped>
.form-group label {
	display: block;
	color: #3d3c63;
	margin-bottom: 5px;
	font-size: 14px;
	font-weight: 500;
}
/* 基础样式保持不变，重点优化时间选择区域 */
.el-time-picker {
	position: relative;
	display: inline-block;
	width: 100%;
}
.el-input {
	position: relative;
	width: 100%;
}
.el-input__inner {
	width: 100%;
	padding: 12px;
	border: 1px solid #eee;
	border-radius: 8px;
	background: #ffffff;
	font-size: 16px;
	outline: none;
	box-sizing: border-box;
	color: #333 !important;
	caret-color: #333 !important;
	transition:
		border-color 0.3s ease,
		box-shadow 0.3s ease;
}
.el-input__inner:focus {
	border-color: #a2d0fa;
	box-shadow: 0 0 0 2px rgba(162, 208, 250, 0.3);
}
.el-input__suffix {
	position: absolute;
	right: 12px;
	top: 50%;
	transform: translateY(-50%);
	color: #c0c4cc;
	transition: color 0.2s;
}
.el-input:focus-within .el-input__suffix {
	color: #409eff;
}

/* 面板样式 */
.el-picker-panel {
	position: absolute;
	left: 0;
	z-index: 2000;
	width: 100%;
	max-width: 320px;
	padding: 12px;
	background-color: #fff;
	border-radius: 4px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
	animation: elZoomIn 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}
@keyframes elZoomInAbove {
	0% {
		opacity: 0;
		transform: scale(0.95) translateY(5px);
	}
	100% {
		opacity: 1;
		transform: scale(1) translateY(0);
	}
}
.el-picker-panel[style*='bottom: 100%'] {
	animation: elZoomInAbove 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}

/* 标签页样式 */
.el-tabs {
	width: 100%;
}
.el-tabs__nav {
	display: flex;
	border-bottom: 1px solid #e4e7ed;
	margin-bottom: 12px;
	padding: 0 8px;
}
.el-tabs__item {
	padding: 8px 12px;
	margin-right: 20px;
	font-size: 14px;
	color: #606266;
	cursor: pointer;
	position: relative;
	transition: color 0.2s;
}
.el-tabs__item:hover {
	color: #409eff;
}
.el-tabs__item.is-active {
	color: #409eff;
	font-weight: 500;
}
.el-tabs__item.is-active::after {
	content: '';
	position: absolute;
	left: 0;
	bottom: -1px;
	width: 100%;
	height: 2px;
	background-color: #409eff;
	transition: width 0.2s;
}
.el-tab-pane {
	width: 100%;
	box-sizing: border-box;
}

/* 日期面板样式 */
.el-picker-panel__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
	padding: 0 8px;
}
.el-picker-panel__icon-btn {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: transparent;
	color: #606266;
	cursor: pointer;
	border-radius: 50%;
	transition: background-color 0.2s;
}
.el-picker-panel__icon-btn:hover {
	background-color: #f5f7fa;
}
.el-picker-panel__label {
	font-size: 14px;
	font-weight: 500;
	color: #303133;
}

/* 日期表格 */
.el-date-table {
	width: 100%;
	margin: 0 auto;
	max-width: 280px;
}
.el-date-table__header,
.el-date-table__body {
	display: flex;
	flex-wrap: wrap;
}
.el-date-table__cell {
	flex: 0 0 calc(100% / 7);
	height: 36px;
	line-height: 36px;
	text-align: center;
	font-size: 13px;
	color: #606266;
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s;
	box-sizing: border-box;
}
.el-date-table__header .el-date-table__cell {
	color: #909399;
	font-weight: 500;
	cursor: default;
}
.el-date-table__cell--disabled {
	color: #c0c4cc;
	cursor: not-allowed;
}
.el-date-table__cell--today {
	color: #409eff;
	font-weight: 500;
}
.el-date-table__cell--selected {
	background-color: #409eff;
	color: #fff;
}
.el-date-table__cell:not(.el-date-table__cell--disabled):hover {
	background-color: #f5f7fa;
}

/* -------------------------- 时间选择样式 -------------------------- */
.el-time-panel {
	padding: 8px 0;
}
.el-time-panel__content {
	display: flex;
	justify-content: center;
	align-items: flex-start;
}

/* 时间选择组：统一包裹时/分/秒区域 */
.time-select-group {
	display: flex;
	align-items: flex-start;
	gap: 6px;
}

/* 单个时间选择项（含单位）：垂直布局 + 统一宽度 */
.time-select-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 20%; /* 相对单位，适配移动端 */
	min-width: 40px;
}

/* 1. 时间单位标识 */
.time-unit {
	font-size: 12px;
	color: #909399;
	text-align: center;
	width: 100%;
	margin-bottom: 4px;
	user-select: none;
}

/* 2. 滚动容器样式：隐藏滚动条 + 固定淡蓝色选中区域 */
.el-time-spinner__wrapper {
	width: 100%;
	height: 180px;
	overflow-y: auto;
	overflow-x: hidden;
	position: relative;
	/* 隐藏滚动条 */
	scrollbar-width: none; /* Firefox */
	-ms-overflow-style: none; /* IE and Edge */
}
/* Chrome, Safari and Opera */
.el-time-spinner__wrapper::-webkit-scrollbar {
	display: none;
}

/* 3. 选中项样式：突出显示并固定在淡蓝色区域内 */
.el-time-spinner__list {
	margin: 0;
	padding: 0;
	list-style: none;
	width: 100%;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.el-time-spinner__list li {
	height: 36px; /* 与蓝色框高度一致 */
	line-height: 36px;
	font-size: 14px;
	color: #606266;
	cursor: pointer;
	transition: all 0.2s ease;
	user-select: none;
	width: 100%;
	box-sizing: border-box;
	text-align: center;
}
/* 选中项：突出显示在淡蓝色区域上方 */
.el-time-spinner__list li.active {
	font-weight: 700;
	color: #409eff; /* 淡蓝色 */
	position: relative;
	z-index: 2; /* 确保在淡蓝色区域上方 */
}
/* hover项：轻微背景色变化 */
.el-time-spinner__list li:hover:not(.active) {
	background-color: #e6f7ff; /* 淡蓝色系hover */
	color: #409eff;
}

/* 面板底部按钮 */
.el-picker-panel__footer {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	padding: 8px 12px 0;
	border-top: 1px solid #f2f3f5;
	margin-top: 8px;
}
.el-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 8px 16px;
	background-color: transparent;
	border: 1px solid #dcdfe6;
	border-radius: 4px;
	font-size: 14px;
	cursor: pointer;
	transition: all 0.3s ease;
	position: relative;
	overflow: hidden;
}
.el-button::before {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 100%;
	height: 100%;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
	transition: left 0.5s;
}
.el-button:hover::before {
	left: 100%;
}
.el-button--text {
	color: #409eff;
	border-color: #409eff;
}
.el-button--text:hover {
	color: #fff;
	background-color: #409eff;
	border-color: #409eff;
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(64, 158, 255, 0.3);
}
.el-button:active {
	transform: translateY(0);
	box-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
}

/* 错误提示和说明文字 */
.error-input {
	border: 1px solid #ff4d4f !important;
	box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.1) !important;
}
.error-message {
	color: #ff4d4f;
	font-size: 0.875rem;
	margin-top: 4px;
	display: block;
}
.block-convert-container {
	margin: 8px 0 0 0;
}
.block-convert {
	margin: 0 0 4px 0;
	font-size: 13px;
	color: #909399;
}
.block-result {
	margin: 0;
	font-size: 14px;
	color: #409eff;
	font-weight: 500;
	padding: 6px 8px;
	background-color: #f0f9ff;
	border-radius: 4px;
	border-left: 3px solid #409eff;
}

/* 动画效果 */
@keyframes elZoomIn {
	0% {
		opacity: 0;
		transform: scale(0.95);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(5px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
.error-fade-enter-from {
	opacity: 0;
	transform: translateY(-5px);
}
.error-fade-enter-active {
	transition: all 0.3s ease;
}
.error-fade-enter-to {
	opacity: 1;
	transform: translateY(0);
}
.block-fade-enter-from {
	opacity: 0;
	transform: translateY(5px);
}
.block-fade-enter-active {
	transition: all 0.3s ease;
}
.block-fade-enter-to {
	opacity: 1;
	transform: translateY(0);
}

/* 响应式适配：保证多端蓝色框位置一致 */
@media (max-width: 480px) {
	.el-picker-panel {
		width: 100%;
		box-sizing: border-box;
		max-width: 100%;
		left: 0;
		right: 0;
	}
	.el-date-table {
		max-width: 100%;
	}
	.time-select-group {
		gap: 4px;
	}
	.time-select-item {
		width: 25%;
		min-width: 35px;
	}
	.time-unit {
		font-size: 11px;
	}
	.el-time-spinner__list li {
		font-size: 13px;
	}
	.el-time-spinner__separator {
		padding-top: 82px;
		font-size: 14px;
	}
	.el-tabs__item {
		padding: 6px 8px;
		margin-right: 12px;
		font-size: 13px;
	}
	.block-result {
		font-size: 13px;
		padding: 4px 6px;
	}
}

/* 平板适配 */
@media (min-width: 481px) and (max-width: 768px) {
	.el-picker-panel {
		max-width: 350px;
	}
	.time-select-item {
		width: 22%;
	}
}
</style>
