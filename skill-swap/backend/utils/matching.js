function calculateMatchScore(user1Skills, user2Skills, user1Prefs, user2Prefs, user1Data, user2Data) {
  let score = 0;
  let maxScore = 0;

  const user1Teach = user1Skills.filter(s => s.type === 'teach').map(s => s.name.toLowerCase());
  const user1Learn = user1Skills.filter(s => s.type === 'learn').map(s => s.name.toLowerCase());
  const user2Teach = user2Skills.filter(s => s.type === 'teach').map(s => s.name.toLowerCase());
  const user2Learn = user2Skills.filter(s => s.type === 'learn').map(s => s.name.toLowerCase());

  maxScore += 40;
  const match1to2 = user1Teach.filter(t => user2Learn.some(l => l.includes(t) || t.includes(l))).length;
  if (match1to2 > 0) score += 20 + (match1to2 * 5);

  maxScore += 40;
  const match2to1 = user2Teach.filter(t => user1Learn.some(l => l.includes(t) || t.includes(l))).length;
  if (match2to1 > 0) score += 20 + (match2to1 * 5);

  maxScore += 15;
  if (user1Prefs.location && user2Prefs.location) {
    if (user1Prefs.location.city === user2Prefs.location.city) {
      score += 15;
    } else if (user1Prefs.location.province === user2Prefs.location.province) {
      score += 8;
    }
  } else {
    score += 10;
  }

  maxScore += 15;
  if (user1Prefs.time && user2Prefs.time) {
    const timeOverlap = user1Prefs.time.filter(t => user2Prefs.time.includes(t)).length;
    if (timeOverlap > 0) {
      score += 10 + (timeOverlap * 2);
    }
  } else {
    score += 10;
  }

  maxScore += 10;
  if (user1Prefs.onlinePreference === user2Prefs.onlinePreference) {
    score += 10;
  } else if (user1Prefs.onlinePreference === 'both' || user2Prefs.onlinePreference === 'both') {
    score += 5;
  }

  maxScore += 10;
  if (user2Data) {
    if (user2Data.rating && user2Data.rating >= 4.5) {
      score += 7;
    } else if (user2Data.rating && user2Data.rating >= 4) {
      score += 4;
    }
    if (user2Data.swapAgainRate !== null && user2Data.swapAgainRate !== undefined) {
      score += Math.round(user2Data.swapAgainRate / 100 * 3);
    }
  } else {
    score += 5;
  }

  return Math.min(100, Math.round((score / maxScore) * 100));
}

function generateRecommendReasons(userId, otherUser, matchedSkills, allReviews) {
  const reasons = [];

  const reviewsByOther = allReviews.filter(r => r.reviewerId === otherUser.id);
  const reviewsAboutOther = allReviews.filter(r => r.targetUserId === otherUser.id);

  if (matchedSkills.iCanLearn.length > 0) {
    reasons.push(`可以向TA学习: ${matchedSkills.iCanLearn.join('、')}`);
  }
  if (matchedSkills.iCanTeach.length > 0) {
    reasons.push(`你可以教授TA: ${matchedSkills.iCanTeach.join('、')}`);
  }

  if (otherUser.rating && otherUser.rating >= 4.5) {
    reasons.push(`高评分搭档 (${otherUser.rating}分)`);
  }

  if (otherUser.swapAgainRate !== null && otherUser.swapAgainRate !== undefined && otherUser.swapAgainRate >= 80) {
    reasons.push(`${otherUser.swapAgainRate}%的搭档愿意再次交换`);
  }

  if (otherUser.teachingStyleTag) {
    reasons.push(`教学风格: ${otherUser.teachingStyleTag}`);
  }

  const myReviewsAboutOther = reviewsByOther.filter(r => r.targetUserId === otherUser.id);
  if (myReviewsAboutOther.some(r => r.wouldSwapAgain === true)) {
    reasons.push('你曾表示愿意再次与TA交换');
  }

  return reasons;
}

function findMatchesForUser(userId, allUsers, allSkills, allReviews) {
  const userSkills = allSkills.filter(s => s.userId === userId);
  const user = allUsers.find(u => u.id === userId);
  if (!user || userSkills.length === 0) return [];

  const reviews = allReviews || [];
  const matches = [];
  const otherUsers = allUsers.filter(u => u.id !== userId);

  for (const other of otherUsers) {
    const otherSkills = allSkills.filter(s => s.userId === other.id);
    if (otherSkills.length === 0) continue;

    const score = calculateMatchScore(
      userSkills,
      otherSkills,
      user.preferences || {},
      other.preferences || {},
      null,
      { rating: other.rating, swapAgainRate: other.swapAgainRate }
    );

    if (score >= 30) {
      const matchedSkills = getMatchedSkills(userSkills, otherSkills);
      const recommendReasons = generateRecommendReasons(userId, other, matchedSkills, reviews);

      matches.push({
        userId: other.id,
        user: {
          id: other.id,
          username: other.username,
          avatar: other.avatar,
          bio: other.bio,
          rating: other.rating,
          exchangeCount: other.exchangeCount,
          teachingStyleTag: other.teachingStyleTag || null,
          swapAgainRate: other.swapAgainRate !== undefined ? other.swapAgainRate : null
        },
        score,
        matchedSkills,
        recommendReasons,
        createdAt: new Date().toISOString()
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

function getMatchedSkills(user1Skills, user2Skills) {
  const user1Teach = user1Skills.filter(s => s.type === 'teach');
  const user1Learn = user1Skills.filter(s => s.type === 'learn');
  const user2Teach = user2Skills.filter(s => s.type === 'teach');
  const user2Learn = user2Skills.filter(s => s.type === 'learn');

  const iCanTeach = user1Teach.filter(t =>
    user2Learn.some(l => l.name.toLowerCase().includes(t.name.toLowerCase()) ||
                        t.name.toLowerCase().includes(l.name.toLowerCase()))
  );

  const iCanLearn = user2Teach.filter(t =>
    user1Learn.some(l => l.name.toLowerCase().includes(t.name.toLowerCase()) ||
                        t.name.toLowerCase().includes(l.name.toLowerCase()))
  );

  return {
    iCanTeach: iCanTeach.map(s => s.name),
    iCanLearn: iCanLearn.map(s => s.name)
  };
}

module.exports = {
  calculateMatchScore,
  findMatchesForUser,
  generateRecommendReasons
};
