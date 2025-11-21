import { Question } from '../models/types';

export class QuestionService {
  private questions: Question[] = [
    {
      id: '1',
      content: '你对加班怎么看？',
      category: 'work',
      difficulty: 'easy'
    },
    {
      id: '2',
      content: '如果可以穿越到任何时代，你会选择哪里？为什么？',
      category: 'philosophy',
      difficulty: 'medium'
    },
    {
      id: '3',
      content: '你觉得AI会取代人类的工作吗？',
      category: 'technology',
      difficulty: 'medium'
    },
    {
      id: '4',
      content: '早睡早起和晚睡晚起，哪个更健康？',
      category: 'life',
      difficulty: 'easy'
    },
    {
      id: '5',
      content: '人类是否有真正的自由意志？',
      category: 'philosophy',
      difficulty: 'hard'
    },
    {
      id: '6',
      content: '你更喜欢猫还是狗？为什么？',
      category: 'life',
      difficulty: 'easy'
    },
    {
      id: '7',
      content: '如果有机会移民火星，你会去吗？',
      category: 'science',
      difficulty: 'medium'
    },
    {
      id: '8',
      content: '社交媒体让人更亲近还是更疏远？',
      category: 'society',
      difficulty: 'medium'
    },
    {
      id: '9',
      content: '你相信命运吗？',
      category: 'philosophy',
      difficulty: 'medium'
    },
    {
      id: '10',
      content: '如果今天是你生命的最后一天，你会做什么？',
      category: 'life',
      difficulty: 'hard'
    },
    {
      id: '11',
      content: '远程工作好还是办公室工作好？',
      category: 'work',
      difficulty: 'easy'
    },
    {
      id: '12',
      content: '你觉得教育的本质是什么？',
      category: 'education',
      difficulty: 'hard'
    },
    {
      id: '13',
      content: '钱能买到幸福吗？',
      category: 'philosophy',
      difficulty: 'medium'
    },
    {
      id: '14',
      content: '你会选择延长寿命还是提高生活质量？',
      category: 'life',
      difficulty: 'hard'
    },
    {
      id: '15',
      content: '如果可以拥有一项超能力，你会选什么？',
      category: 'fun',
      difficulty: 'easy'
    },
    {
      id: '16',
      content: '艺术的价值是什么？',
      category: 'art',
      difficulty: 'hard'
    },
    {
      id: '17',
      content: '你更看重过程还是结果？',
      category: 'philosophy',
      difficulty: 'medium'
    },
    {
      id: '18',
      content: '科技发展是让生活更好还是更糟？',
      category: 'technology',
      difficulty: 'medium'
    },
    {
      id: '19',
      content: '你觉得外星生命存在吗？',
      category: 'science',
      difficulty: 'easy'
    },
    {
      id: '20',
      content: '如果可以知道未来，你想知道吗？',
      category: 'philosophy',
      difficulty: 'hard'
    }
  ];

  private usedQuestions: Set<string> = new Set();

  getRandomQuestion(excludeIds?: string[]): Question {
    // Filter out used questions and excluded ones
    let availableQuestions = this.questions.filter(
      q => !this.usedQuestions.has(q.id) && !excludeIds?.includes(q.id)
    );

    // If all questions have been used, reset
    if (availableQuestions.length === 0) {
      this.usedQuestions.clear();
      availableQuestions = this.questions;
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedQuestion = availableQuestions[randomIndex];

    this.usedQuestions.add(selectedQuestion.id);

    return selectedQuestion;
  }

  getQuestionById(id: string): Question | undefined {
    return this.questions.find(q => q.id === id);
  }

  getQuestionsByCategory(category: string): Question[] {
    return this.questions.filter(q => q.category === category);
  }

  getQuestionsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Question[] {
    return this.questions.filter(q => q.difficulty === difficulty);
  }

  resetUsedQuestions(): void {
    this.usedQuestions.clear();
  }
}

export default QuestionService;

