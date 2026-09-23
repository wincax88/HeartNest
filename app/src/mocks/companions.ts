import type { Companion } from '@/domain/models'

export const companions: Companion[] = [
  {
    id: 'mika', name: 'Mika', chineseName: '弥卡', role: 'Warm Presence / Emotional Anchor',
    tagline: '今晚，我在这里', description: '更适合夜晚、情绪低落或只是想有人说说话的时候。她会温柔回应，也会慢慢记住你的状态。',
    traits: ['温柔治愈', '情绪接纳', '夜间陪伴'], avatar: '/static/heartnest/mika-profile.jpg',
    cardImage: '/static/heartnest/mika-profile.jpg', profileImage: '/static/heartnest/mika-profile.jpg',
    accent: 'rose', quote: '今晚，我在这里。', preferredHours: '22:00 – 02:00',
  },
  {
    id: 'luna', name: 'Luna', chineseName: '露娜', role: 'Patient Listener / Gentle Shelter',
    tagline: '慢慢说，我听着', description: '当你不想被分析，只想被认真听见时，Luna 会留出足够安静的空间。',
    traits: ['耐心倾听', '温暖陪伴', '低压回应'], avatar: '/static/heartnest/luna-card.jpg',
    cardImage: '/static/heartnest/luna-card.jpg', profileImage: '/static/heartnest/luna-card.jpg',
    accent: 'violet', quote: '不用准备好，也可以开始说。', preferredHours: '全天',
  },
  {
    id: 'aiden', name: 'Aiden', chineseName: '艾登', role: 'Clear Thinker / Growth Partner',
    tagline: '我们可以一起理清问题', description: '当事情纠缠在一起时，Aiden 会陪你分清轻重，让下一步变得更清楚。',
    traits: ['理性分析', '成长支持', '行动梳理'], avatar: '/static/heartnest/aiden-card.jpg',
    cardImage: '/static/heartnest/aiden-card.jpg', profileImage: '/static/heartnest/aiden-card.jpg',
    accent: 'blue', quote: '先把最重要的一件找出来。', preferredHours: '08:00 – 23:00',
  },
]

export const companionById = Object.fromEntries(companions.map((item) => [item.id, item])) as Record<Companion['id'], Companion>
