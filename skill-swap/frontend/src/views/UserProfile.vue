<template>
  <div class="user-profile">
    <div v-if="user" class="card profile-header-card">
      <div class="profile-header">
        <el-avatar :src="user.avatar" :size="100" />
        <div class="profile-info">
          <h1 class="username">{{ user.username }}</h1>
          <div class="user-meta">
            <el-rate :model-value="user.rating" disabled />
            <span class="rating">{{ user.rating }}</span>
            <span class="divider">|</span>
            <span>{{ user.exchangeCount || 0 }} 次交换</span>
            <span class="divider">|</span>
            <span>{{ user.skillPoints || 0 }} 技能点</span>
          </div>
          <p class="bio">{{ user.bio || '这个人很懒，什么都没写' }}</p>
        </div>
        <div class="action-buttons">
          <el-button type="primary" @click="goToChat">
            <el-icon><ChatDotRound /></el-icon>发送消息
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="user" class="profile-grid">
      <div class="card">
        <h2 class="section-title">🎓 技能</h2>
        <div class="skills-section">
          <div class="skill-type">
            <h3 class="subsection-title">可教</h3>
            <div class="skills-tags">
              <span v-for="skill in teachSkills" :key="skill.id" class="skill-tag skill-teach">
                {{ skill.name }}
                <small>{{ skill.level }}</small>
              </span>
            </div>
            <el-empty v-if="teachSkills.length === 0" description="暂无" :image-size="60" />
          </div>
          <div class="skill-type">
            <h3 class="subsection-title">想学</h3>
            <div class="skills-tags">
              <span v-for="skill in learnSkills" :key="skill.id" class="skill-tag skill-learn">
                {{ skill.name }}
              </span>
            </div>
            <el-empty v-if="learnSkills.length === 0" description="暂无" :image-size="60" />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">📝 交换复盘摘要</h2>
        <div v-if="retrospective" class="retrospective-section">
          <div v-if="retrospective.teachingStyles.length" class="retro-block">
            <h3 class="retro-subtitle">🏷️ 教学风格</h3>
            <div class="style-tags">
              <span v-for="ts in retrospective.teachingStyles" :key="ts.style" class="style-tag">
                {{ ts.style }} <small>({{ ts.count }}次)</small>
              </span>
            </div>
          </div>
          <div v-if="retrospective.swapAgainRate !== null" class="retro-block">
            <h3 class="retro-subtitle">🔁 搭档回头率</h3>
            <div class="swap-again-bar">
              <div class="swap-again-fill" :style="{ width: retrospective.swapAgainRate + '%' }"></div>
              <span class="swap-again-text">{{ retrospective.swapAgainRate }}% 愿意再次交换</span>
            </div>
          </div>
          <div v-if="retrospective.learnedContents.length" class="retro-block">
            <h3 class="retro-subtitle">📚 TA学到的</h3>
            <div class="learned-list">
              <div v-for="(lc, idx) in retrospective.learnedContents.slice(0, 3)" :key="idx" class="learned-item">
                <span class="learned-content">{{ lc.content }}</span>
                <span class="learned-time">{{ formatTime(lc.createdAt) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-if="!retrospective.teachingStyles.length && retrospective.swapAgainRate === null && !retrospective.learnedContents.length" description="暂无复盘数据" />
        </div>
        <el-empty v-else description="暂无复盘数据" />
      </div>
    </div>

    <div class="card">
      <h2 class="section-title">⭐ 评价</h2>
      <div v-if="reviews.length" class="reviews-list">
        <div v-for="review in reviews" :key="review.id" class="review-item">
          <div class="review-header">
            <el-avatar :src="review.reviewerAvatar" :size="40" />
            <div class="reviewer-info">
              <span class="reviewer-name">{{ review.reviewerName }}</span>
              <el-rate :model-value="review.rating" disabled size="small" />
            </div>
          </div>
          <p class="review-content">{{ review.comment }}</p>
          <div v-if="review.learnedContent || review.teachingStyle || review.wouldSwapAgain !== null" class="review-meta">
            <span v-if="review.learnedContent" class="meta-tag meta-learn">学到: {{ review.learnedContent }}</span>
            <span v-if="review.teachingStyle" class="meta-tag meta-style">教学: {{ review.teachingStyle }}</span>
            <span v-if="review.wouldSwapAgain !== null" class="meta-tag" :class="review.wouldSwapAgain ? 'meta-yes' : 'meta-no'">
              {{ review.wouldSwapAgain ? '愿意再交换' : '不愿再交换' }}
            </span>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无评价" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authAPI, reviewAPI } from '../api'
import dayjs from 'dayjs'
import { ChatDotRound } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const user = ref(null)
const reviews = ref([])
const retrospective = ref(null)

const teachSkills = computed(() => user.value?.skills?.filter(s => s.type === 'teach') || [])
const learnSkills = computed(() => user.value?.skills?.filter(s => s.type === 'learn') || [])

onMounted(async () => {
  await loadUser()
  await loadReviews()
  await loadRetrospective()
})

async function loadUser() {
  try {
    const res = await authAPI.getUser(route.params.userId)
    user.value = res.data
  } catch (e) {}
}

async function loadReviews() {
  try {
    const res = await reviewAPI.getReviews(route.params.userId)
    reviews.value = res.data
  } catch (e) {}
}

async function loadRetrospective() {
  try {
    const res = await reviewAPI.getRetrospective(route.params.userId)
    retrospective.value = res.data
  } catch (e) {}
}

function goToChat() {
  router.push(`/chat/${route.params.userId}`)
}

function formatTime(time) {
  return dayjs(time).format('YYYY-MM-DD')
}
</script>

<style scoped>
.user-profile {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-header-card {
  padding: 32px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
}

.profile-info {
  flex: 1;
}

.username {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
}

.rating {
  font-weight: 600;
  color: #ff9800;
}

.divider {
  color: #ddd;
}

.bio {
  color: #666;
  line-height: 1.6;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.skills-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.skill-type {
  margin-bottom: 0;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag small {
  opacity: 0.8;
  margin-left: 4px;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.reviewer-info {
  flex: 1;
}

.reviewer-name {
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.review-content {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.retrospective-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.retro-block {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.retro-subtitle {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.style-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.style-tag {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 13px;
  font-weight: 500;
}

.style-tag small {
  opacity: 0.85;
}

.swap-again-bar {
  position: relative;
  height: 32px;
  background: #eee;
  border-radius: 16px;
  overflow: hidden;
}

.swap-again-fill {
  height: 100%;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 16px;
  transition: width 0.6s ease;
}

.swap-again-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.learned-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.learned-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
}

.learned-content {
  color: #333;
  font-size: 14px;
  flex: 1;
  margin-right: 12px;
}

.learned-time {
  color: #999;
  font-size: 12px;
  white-space: nowrap;
}

.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.meta-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.meta-learn {
  background: #fff3e0;
  color: #ef6c00;
}

.meta-style {
  background: #e8f5e9;
  color: #2e7d32;
}

.meta-yes {
  background: #e8f5e9;
  color: #2e7d32;
}

.meta-no {
  background: #ffebee;
  color: #c62828;
}
</style>
