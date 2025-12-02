<template>
	<div class="share-mask" @click.self="handleClose">
		<div class="share-card" ref="cardRef" :style="{ backgroundImage: `url(${sharedBg})` }">
			<header class="share-header">
				<div class="share-title">
					<p class="title-main">{{ t('share_deposit_success') }}</p>
					<p class="title-sub">
						<span>{{ amount }}TBC</span>
						<span class="divider">/</span>
						<span>{{ displayTerm }}</span>
					</p>
				</div>
				<button
					type="button"
					class="shared-download"
					:class="{ 'is-loading': isDownloading }"
					@click.stop="handleDownload"
					aria-label="下载"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						width="30px"
						height="30px"
						viewBox="0 0 30 30"
						version="1.1"
					>
						<title>下载</title>
						<defs>
							<circle id="path-1" cx="15" cy="15" r="15" />
						</defs>
						<g id="方案" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
							<g id="存入分享" transform="translate(-256, -269)">
								<g id="下载" transform="translate(256, 269)">
									<mask id="mask-2" fill="white">
										<use xlink:href="#path-1" />
									</mask>
									<use id="蒙版" fill="#000000" xlink:href="#path-1" />
									<g id="图形" mask="url(#mask-2)">
										<g transform="translate(5, 5)" id="编组">
											<g transform="translate(1.0876, 2.3919)">
												<path
													d="M17.674915,7.35805262 C17.112415,5.57055262 15.399915,4.42055262 13.312415,4.42055262 L12.999915,4.42055262 C12.1255935,2.03553054 9.9850133,0.344327229 7.462415,0.045552622 C4.712415,-0.279447378 2.024915,1.15805262 0.749914998,3.60805262 C-0.52048137,6.07605211 -0.15370577,9.06973404 1.674915,11.1580526 C1.974915,11.4955526 2.499915,11.5330526 2.849915,11.2330526 C3.187415,10.9330526 3.224915,10.4080526 2.924915,10.0580526 C1.55103779,8.48841101 1.27363874,6.2394973 2.224915,4.38305262 C3.187415,2.54555262 5.212415,1.45805262 7.274915,1.70805262 C9.34993311,1.95477766 11.0616089,3.44815274 11.587415,5.47055262 C11.687415,5.83305262 12.012415,6.09555262 12.387415,6.09555262 L13.312415,6.09555262 C14.649915,6.09555262 15.737415,6.79555262 16.087415,7.88305262 C16.462415,9.07055262 16.037415,10.3455526 15.012415,11.0705526 C14.6378841,11.3374186 14.5486031,11.8563642 14.812415,12.2330526 C14.9378995,12.4127078 15.1298888,12.5348595 15.3457881,12.5724072 C15.5616874,12.6099549 15.7836441,12.5597938 15.962415,12.4330526 C17.587415,11.2705526 18.274915,9.24555262 17.674915,7.35805262 L17.674915,7.35805262 Z"
													id="路径"
													fill="#FFFFFF"
													fill-rule="nonzero"
												/>
												<path
													class="download-arrow"
													d="M10.862415,11.2580526 L9.749915,12.3705526 L9.749915,7.19555262 C9.749915,6.73305262 9.374915,6.37055262 8.912415,6.37055262 C8.449915,6.37055262 8.087415,6.74555262 8.087415,7.20805262 L8.087415,12.3830526 L6.962415,11.2580526 C6.75252146,11.0481591 6.44659497,10.9661863 6.15987507,11.0430127 C5.87315517,11.1198391 5.64920143,11.3437928 5.57237506,11.6305127 C5.4955487,11.9172326 5.57752146,12.2231591 5.787415,12.4330526 L8.324915,14.9705526 C8.387415,15.0330526 8.449915,15.0580526 8.512415,15.0955526 C8.537415,15.1080526 8.562415,15.1330526 8.587415,15.1455526 C8.687415,15.1830526 8.799915,15.2080526 8.912415,15.2080526 C8.949915,15.2080526 8.974915,15.1955526 9.012415,15.1830526 C9.087415,15.1705526 9.162415,15.1705526 9.224915,15.1330526 C9.337415,15.0955526 9.424915,15.0205526 9.512415,14.9455526 L12.037415,12.4205526 C12.362415,12.0955526 12.362415,11.5705526 12.037415,11.2455526 C11.712415,10.9205526 11.187415,10.9330526 10.862415,11.2580526 L10.862415,11.2580526 Z"
													id="路径"
													fill="#FFFFFF"
													fill-rule="nonzero"
												/>
											</g>
										</g>
									</g>
								</g>
							</g>
						</g>
					</svg>
				</button>
			</header>
			<section class="share-body">
				<Transition name="slogan-typing" mode="out-in">
					<div class="slogan-wrapper" :key="locale + '-' + sloganIndex">
						<p class="slogan-main">
							{{ currentSlogan.line1 }}
						</p>
						<p class="slogan-main" v-if="currentSlogan.line2">
							{{ currentSlogan.line2 }}
						</p>
					</div>
				</Transition>
				<p class="time-line">
					<span class="title-sub">{{ displayTime }}</span>
					<button type="button" class="time-refresh" @click.stop="refreshTime">
						{{ t('share_refresh') }}
					</button>
				</p>
			</section>
			<!-- 移动端额外提供一个真实链接，方便长按或点击下载海报 -->
			<p v-if="isMobile && posterUrl" class="poster-hint">
				<a :href="posterUrl" :download="posterFileName">
					{{ locale === 'zh' ? '如未弹出分享面板，可点击此处或长按保存海报' : 'If sharing did not appear, tap or long‑press here to save the poster.' }}
				</a>
			</p>
			<img src="@/assets/images/shared-logo@2x.png" alt="logo" class="shared-logo" />
			<p class="share-tip-global">
				{{ saveTip }}
			</p>
		</div>
		<!-- 加载中提示 -->
		<div v-if="isDownloading" class="download-loading">
			<div class="loading-spinner"></div>
			<p class="loading-text">{{ t('loading') }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
// @ts-ignore
import html2canvas from 'html2canvas';
import { computed, ref, onMounted } from 'vue';
import { locale, t } from '../i18n';
import sharedBg from '../assets/images/shared-bg@2x.png';

const props = defineProps<{
	amount: number | string;
	termLabel: string;
	timestamp?: number; // 传入的当次存入时间戳（毫秒），可选
}>();

const emit = defineEmits<{
	close: [];
	'download-success': [];
	'download-fail': [];
}>();

const currentTime = ref<Date | null>(null);
const cardRef = ref<HTMLElement | null>(null);
const isDownloading = ref(false);
const sloganIndex = ref(0);
const posterUrl = ref<string | null>(null);
const posterFileName = ref<string>('');

function refreshTime() {
	// 更新时间
	currentTime.value = new Date();

	// 刷新暖心短句：在当前语言下随机切换一句
	const enList = quotesEnShort.length ? quotesEnShort : quotesEn;
	const list = locale.value === 'zh' ? quotesZh : enList;
	if (!list.length) return;
	let next = Math.floor(Math.random() * list.length);
	// 尽量避免连续两次同一句
	if (list.length > 1 && next === sloganIndex.value) {
		next = (next + 1) % list.length;
	}
	sloganIndex.value = next;
}

onMounted(() => {
	currentTime.value = props.timestamp ? new Date(props.timestamp) : new Date();
});

// 暖心短句列表（中英文）
const quotesZh: string[] = [
	'存一份安心，等时光酿成甜酿',
	'小小角落藏温暖，存下此刻心安然',
	'每一次存放，都是给未来的拥抱',
	'静存此刻暖心，岁月自会书写答案',
	'存下心意，让日子长出温柔枝芽',
	'角落有归处，存满日常的微光',
	'存一份期待，像种子等待春天发芽',
	'轻轻放进去，心便有了安稳港湾',
	'存下此刻心晴，阴天也有光可循',
	'小小存罐里，藏着岁月的慢歌',
	'存一份从容，让时光走得轻轻的',
	'存下心头暖，日子便多了份甜',
	'像存一朵云，等天空想念时相见',
	'存下此刻笑，回忆会自己发光',
	'小小空间里，存满生活的星屑',
	'存一份相信，未来会来敲这扇门',
	'存下此刻风，吹过四季都温柔',
	'像存一片叶，等秋天讲它的故事',
	'存一份安心，让心有个软软的家',
	'存下此刻念，日子便有了小盼头',
	'小小存罐中，藏着日子的糖霜',
	'存一份静气，听时光在耳边低语',
	'存下心头月光，黑夜也有清辉照耀',
	'像存一颗星，等夜空想它时亮起',
	'存下此刻暖阳，寒天也能焐热手心',
	'小小角落里，存满岁月的呢喃',
	'存一份期待，像花苞等风来吻开',
	'存下此刻，心便张开了翅膀',
	'像存一滴露，等清晨讲它的晶莹',
	'存一份安心，让梦有个踏实归处',
	'存下此刻阳，阴霾也会悄悄退场',
	'小小存罐里，藏着日子的诗行',
	'存一份从容，看云卷云舒都刚好',
	'存下心头草，荒原也能绿成毛毯',
	'像存一只蝶，等春天看它起舞翩翩',
	'存下此刻心宁，世界便小成安乐窝',
	'小小空间藏暖意，存满日常的甜蜜',
	'存一份相信，时光会把故事写圆满',
	'存下此刻溪，干涸的心田自会润开',
	'像存一片雪，等冬天讲它的轻盈',
	'存一份安心，让心像船靠了岸',
	'存下此刻光，暗处也能看清脚尖',
	'小小存罐中，藏着岁月的浅笑',
	'存一份期待，像芽尖等雨来吻醒',
	'存下心头风，燥热的天也变温柔',
	'像存一只鸟，等林间唱它的歌谣',
	'存下此刻暖，冷天也能焐热眉梢',
	'小小角落里，存满日光的星子',
	'存一份从容，任日子慢慢绣花纹',
	'存下此刻念，未来会带着笑走来',
];

const quotesEn: string[] = [
	'Store a peace of mind, let time brew sweetness.',
	'A small corner holds warmth, store this moment of calm.',
	'Each deposit is an embrace for the future.',
	'Quietly store this warmth, time will write its answers.',
	'Store this thought, let days grow tender buds.',
	'A corner has a home, filled with daily gentle glow.',
	'Store a hope, like a seed waiting for spring to sprout.',
	'Gently place it in, heart finds a safe harbor.',
	'Store this sunny mood, light guides even on cloudy days.',
	'In the small jar, hides time’s slow song.',
	'Store calmness, let time pass softly.',
	'Store heart’s warmth, days gain more sweetness.',
	'Like storing a cloud, meet when sky misses it.',
	'Store this smile, memories will glow on their own.',
	'In small space, stardust of life is stored.',
	'Store faith, future will knock this door.',
	'Store this wind, it blows gently through all seasons.',
	'Like storing a leaf, hear its story in autumn.',
	'Store peace, give heart a soft home.',
	'Store this thought, days have a little hope.',
	'In small jar, days’ frosting is hidden.',
	'Store tranquility, listen to time whisper by ear.',
	'Store moonlight in heart, night has clear glow.',
	'Like storing a star, shine when night sky misses it.',
	'Store this warm sun, cold days warm palms.',
	'In small corner, years’ murmurs are stored.',
	'Store hope, like bud waiting for wind to kiss open.',
	'Store this moment, heart spreads wings.',
	'Like storing a dew drop, hear its clarity at dawn.',
	'Store peace, give dreams a solid home.',
	'Store this sun, haze will quietly fade.',
	'In small jar, lines of days’ poetry are hidden.',
	'Store ease, watch clouds roll just right.',
	'Store grass in heart, wasteland greens to rug.',
	'Like storing a butterfly, watch it dance in spring.',
	'Store this calm heart, world shrinks to cozy nest.',
	'Small space holds warmth, stores daily sweetness.',
	'Store faith, time will round the story.',
	'Store this stream, dry heartland will moisten.',
	'Like storing snow, hear its lightness in winter.',
	'Store peace, let heart dock like a boat.',
	'Store this light, see toes clearly in dark.',
	'In small jar, years’ faint smiles are hidden.',
	'Store hope, like bud tip waiting for rain to wake.',
	'Store wind in heart, hot days turn gentle.',
	'Like storing a bird, hear its song in woods.',
	'Store this warmth, cold days warm eyebrows.',
	'In small corner, sunlight stars are stored.',
	'Store ease, let days embroider patterns slowly.',
	'Store this thought, future comes smiling.',
];

// 过滤过长的英文标语，避免超过两行显示
const MAX_EN_QUOTE_LENGTH = 40;
const quotesEnShort: string[] = quotesEn.filter((s) => s.length <= MAX_EN_QUOTE_LENGTH);
console.log('quotesEnShort', quotesEnShort);
// 当前展示的暖心短句（自动按中英文分两行）
const currentSlogan = computed(() => {
	const enList = quotesEnShort.length ? quotesEnShort : quotesEn;
	const list = locale.value === 'zh' ? quotesZh : enList;
	if (!list.length) {
		return { line1: '', line2: '' };
	}
	const s = list[sloganIndex.value % list.length] || list[0]!;
	// 分割符：中文优先用顿号/逗号，英文用逗号
	const separators = locale.value === 'zh' ? ['，', '。'] : [',', '.'];
	let idx = -1;
	for (const sep of separators) {
		const pos = s.indexOf(sep);
		if (pos > 0) {
			idx = pos + 1; // 保留标点在前一行
			break;
		}
	}
	if (idx > 0) {
		return {
			line1: s.slice(0, idx),
			line2: s.slice(idx).trim(),
		};
	}
	return { line1: s, line2: '' };
});
const displayTime = computed(() => {
	const date = currentTime.value;
	if (!date) return '';

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hour = String(date.getHours()).padStart(2, '0');
	const minute = String(date.getMinutes()).padStart(2, '0');

	return locale.value === 'zh'
		? `${year}.${month}.${day} ${hour}:${minute}`
		: `${year}-${month}-${day} ${hour}:${minute}`;
});

const saveTip = computed(() => (locale.value === 'zh' ? t('share_tip_mobile') : t('share_tip_pc')));

const isMobile = computed(() =>
	/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
);

const waitBgImageLoad = (imageUrl: string): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous'; // 允许跨域，确保 html2canvas 能捕获
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('背景图加载失败'));
		img.src = imageUrl;
	});
};

async function handleDownload() {
	const cardEl = cardRef.value;
	if (!cardEl) return;

	// 防止重复点击
	if (isDownloading.value) return;

	isDownloading.value = true;

	try {
		// 等待背景图片加载完成
		await waitBgImageLoad(sharedBg);

		// 隐藏不需要的元素
		const downloadBtn = cardEl.querySelector('.shared-download') as HTMLElement;
		const refreshBtn = cardEl.querySelector('.time-refresh') as HTMLElement;
		const tipText = cardEl.querySelector('.share-tip-global') as HTMLElement;
		const elementsToHide = [downloadBtn, refreshBtn, tipText].filter(Boolean);
		const originalDisplays = elementsToHide.map((el) => el.style.display);
		elementsToHide.forEach((el) => (el.style.display = 'none'));

		// 保存原始样式和父元素
		const originalBoxShadow = cardEl.style.boxShadow;
		const parentEl = cardEl.parentElement;
		const nextSibling = cardEl.nextSibling;

		// 将元素临时移到 body，完全脱离遮罩层
		cardEl.style.boxShadow = 'none';
		cardEl.style.position = 'fixed';
		cardEl.style.top = '-9999px';
		cardEl.style.left = '-9999px';
		cardEl.style.zIndex = '9999';

		// 从原位置移除，添加到 body
		document.body.appendChild(cardEl);

		// 等待样式应用和 DOM 更新，确保背景图片已渲染
		await new Promise((resolve) => setTimeout(resolve, 200));

		// 先加载背景图片
		const bgImage = await waitBgImageLoad(sharedBg);

		// 截图，使用白色背景避免圆角区域出现黑色
		const contentCanvas = await html2canvas(cardEl, {
			scale: window.devicePixelRatio || 2,
			useCORS: true,
			logging: false,
			backgroundColor: '#ffffff', // 使用白色背景，避免圆角区域出现黑色
			removeContainer: false,
			allowTaint: false,
		});

		// 将元素移回原位置，但保持离屏状态，避免用户再次看到原卡片内容
		if (nextSibling && parentEl) {
			parentEl.insertBefore(cardEl, nextSibling);
		} else if (parentEl) {
			parentEl.appendChild(cardEl);
		}
		// 不再恢复位置相关样式，继续保持 fixed + -9999px，组件销毁时自然清理
		cardEl.style.boxShadow = originalBoxShadow;

		// 恢复隐藏元素的显示状态
		elementsToHide.forEach((el, i) => (el.style.display = originalDisplays[i] || ''));

		// 创建背景图片的 canvas（只创建一次，提高效率）
		const bgCanvas = document.createElement('canvas');
		bgCanvas.width = bgImage.width;
		bgCanvas.height = bgImage.height;
		const bgCtx = bgCanvas.getContext('2d');
		if (bgCtx) {
			bgCtx.drawImage(bgImage, 0, 0);
		}
		const bgImageData = bgCtx?.getImageData(0, 0, bgImage.width, bgImage.height).data;

		// 创建最终的 canvas，先绘制背景图片，再绘制内容
		const finalCanvas = document.createElement('canvas');
		finalCanvas.width = contentCanvas.width;
		finalCanvas.height = contentCanvas.height;
		const finalCtx = finalCanvas.getContext('2d');

		if (!finalCtx || !bgImageData) return;

		// 先绘制背景图片
		finalCtx.drawImage(bgImage, 0, 0, finalCanvas.width, finalCanvas.height);

		// 再绘制内容（这样背景图片在底层）
		finalCtx.drawImage(contentCanvas, 0, 0);

		// 处理黑色和透明像素：将黑色或透明像素替换为背景图片对应位置的颜色
		const imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
		const data = imageData.data;
		const width = finalCanvas.width;
		const height = finalCanvas.height;

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const i = (y * width + x) * 4;
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				const alpha = data[i + 3] ?? 255;

				// 如果像素是黑色或透明，使用背景图片的颜色替换
				const isBlackOrTransparent = alpha === 0 || (r === 0 && g === 0 && b === 0 && alpha < 255);

				if (isBlackOrTransparent) {
					// 从背景图片的对应位置获取颜色
					const bgX = Math.floor((x / width) * bgImage.width);
					const bgY = Math.floor((y / height) * bgImage.height);
					const bgI = (bgY * bgImage.width + bgX) * 4;

					data[i] = bgImageData[bgI] ?? 255; // R
					data[i + 1] = bgImageData[bgI + 1] ?? 255; // G
					data[i + 2] = bgImageData[bgI + 2] ?? 255; // B
					data[i + 3] = 255; // A
				}
			}
		}

		finalCtx.putImageData(imageData, 0, 0);

		const canvas = finalCanvas;

		// 预先生成 Blob 和本地 URL，供下载和手动保存使用
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob((b) => resolve(b), 'image/png'),
		);
		if (!blob) {
			throw new Error('Failed to create blob');
		}
		if (posterUrl.value) {
			URL.revokeObjectURL(posterUrl.value);
		}
		const fileName = `honey-bank-${Date.now()}.png`;
		const objectUrl = URL.createObjectURL(blob);
		posterUrl.value = objectUrl;
		posterFileName.value = fileName;

		const downloadPromise = new Promise<void>((resolve, reject) => {
			if (isMobile.value) {
				// 优先尝试调用移动端原生分享面板（Web Share API）
				const nav: any = navigator;
				if (nav && typeof nav.share === 'function') {
					(async () => {
						try {
							// 优先使用文件分享（部分浏览器支持）
							if (
								nav.canShare &&
								nav.canShare({
									files: [new File([blob], fileName, { type: 'image/png' })],
								})
							) {
								const file = new File([blob], fileName, { type: 'image/png' });
								await nav.share({
									files: [file],
									title: 'Honey Bank',
									text: locale.value === 'zh'
										? '分享你的存入卡片'
										: 'Share your Honey Bank deposit card',
								});
								resolve();
								return;
							}

							// 退化为分享链接 / DataURL
							const dataUrl = canvas.toDataURL('image/png');
							await nav.share({
								title: 'Honey Bank',
								text: locale.value === 'zh'
									? '分享你的存入卡片'
									: 'Share your Honey Bank deposit card',
								url: dataUrl,
							});
							resolve();
						} catch (err) {
							// 用户取消分享不视为错误，其余情况回退到打开新窗口
							console.warn('navigator.share failed, fallback to window.open', err);
							const dataUrl = canvas.toDataURL('image/png');
							const win = window.open();
							if (win) {
								win.document.title = fileName;
								const img = win.document.createElement('img');
								img.src = dataUrl;
								img.style.width = '100%';
								img.style.maxWidth = '100%';
								win.document.body.appendChild(img);
								resolve();
							} else {
								reject(new Error('Failed to open window'));
							}
						}
					})();
				} else {
					// 不支持 Web Share API，保持原有行为：新窗口展示图片，用户长按保存
					const dataUrl = canvas.toDataURL('image/png');
					const win = window.open();
					if (win) {
						win.document.title = fileName;
						const img = win.document.createElement('img');
						img.src = dataUrl;
						img.style.width = '100%';
						img.style.maxWidth = '100%';
						win.document.body.appendChild(img);
						resolve();
					} else {
						reject(new Error('Failed to open window'));
					}
				}
			} else {
				// 桌面端：保持下载为文件的行为（使用已生成的 objectUrl）
				const a = document.createElement('a');
				a.href = objectUrl;
				a.download = fileName;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				resolve();
			}
		});

		await downloadPromise;

		// 下载成功后，关闭蒙版并通知父组件展示统一的成功提示
		isDownloading.value = false;
		handleClose();
		emit('download-success');
	} catch (error) {
		console.error('Failed to download share image:', error);
		isDownloading.value = false;
		emit('download-fail');
	}
}

const displayTerm = computed(() => {
	const base = String(props.termLabel || '').trim();
	if (!base) return '';
	if (locale.value === 'zh') {
		return base.endsWith('期') ? base : `${base}期`;
	}
	return /term$/i.test(base) ? base : `${base} Term`;
});

function handleClose() {
	emit('close');
}
</script>

<style scoped>
.share-mask {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
}

.share-card {
	position: relative;
	width: 256px;
	height: 310px;
	border-radius: 24px;
	background-repeat: no-repeat;
	background-position: center center;
	background-size: 100% 100%;
	padding: 20px 20px 16px;
	box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
	font-family:
		'PingFang SC',
		'Microsoft YaHei',
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
		sans-serif;
}

.share-tip-global {
	position: absolute;
	left: 50%;
	bottom: -24px;
	transform: translateX(-50%);
	font-size: 12px;
	color: rgba(255, 255, 255, 0.9);
	text-align: center;
	padding: 0 16px;
	white-space: nowrap;
}

.share-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.share-title {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
}

.title-main {
	font-family: 'DemoItalicBold';
	font-size: 14px;
	font-weight: 900;
	color: #000000;
	letter-spacing: 0.78px;
}

.title-sub {
	font-size: 12px;
	color: rgba(0, 0, 0, 0.3);
	display: flex;
	align-items: center;
	gap: 2px;
	font-weight: 600;
}

.divider {
	color: rgba(0, 0, 0, 0.2);
}

.share-body {
	padding: 8px 0 12px;
}

.slogan-wrapper {
	display: inline-block;
}

.slogan-main {
	font-family: 'DemoItalicBold';
	color: #000000;
	margin-bottom: 4px;
	font-size: 16px;
	letter-spacing: 1px;
	line-height: 28px;
}

.time-line {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	color: rgba(0, 0, 0, 0.6);
	/* margin-bottom: 16px; */
}

.poster-hint {
	margin-top: 4px;
	font-size: 10px;
	color: rgba(0, 0, 0, 0.4);
}

.poster-hint a {
	color: inherit;
	text-decoration: underline;
}

/* 暖心短句切换打字机效果 */
.slogan-typing-enter-active {
	animation: sloganTyping 0.6s steps(24, end);
}

.slogan-typing-leave-active {
	opacity: 0;
	transition: opacity 0.2s ease;
}

@keyframes sloganTyping {
	from {
		clip-path: inset(0 100% 0 0);
	}
	to {
		clip-path: inset(0 0 0 0);
	}
}

.time-refresh {
	border: none;
	background: none;
	color: #ffb03b;
	font-size: 12px;
	cursor: pointer;
	padding: 0;
}

.shared-logo {
	width: 90px;
	height: 90px;
}

.shared-download {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	flex-shrink: 0;
	cursor: pointer;
	background: none;
	border: none;
	padding: 0;
	transition:
		transform 0.2s ease,
		opacity 0.2s ease;
}

/* 默认状态：箭头持续轻微向下弹跳 */
.shared-download .download-arrow {
	animation: arrowBounce 1s cubic-bezier(0.33, 0.6, 0.4, 1) infinite;
	transform-origin: 50% 60%;
}

.shared-download:hover {
	transform: scale(1.1);
}

.shared-download:active {
	transform: scale(0.95);
}

.shared-download.is-loading {
	opacity: 0.6;
	cursor: not-allowed;
	pointer-events: none;
	transform: scale(1);
}

.shared-download.is-loading .download-arrow {
	animation: none;
}

/* 箭头向下弹跳动画 - 柔和的呼吸式下滑效果 */
@keyframes arrowBounce {
	0% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(2px);
	}
	100% {
		transform: translateY(0);
	}
}

.download-loading {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 1000;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	background: rgba(255, 255, 255, 0.95);
	padding: 24px 32px;
	border-radius: 12px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.loading-spinner {
	width: 40px;
	height: 40px;
	border: 3px solid rgba(255, 176, 59, 0.2);
	border-top-color: #ffb03b;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.loading-text {
	font-family: 'DemoItalicBold';
	margin: 0;
	font-size: 14px;
	color: #333;
	font-weight: 500;
}
</style>
