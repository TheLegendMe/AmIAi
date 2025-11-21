import { Router } from 'express';

const router = Router();

// 全局连接计数器 - 自己维护连接状态
export class ConnectionTracker {
  // 静态属性用于跟踪所有连接
  private static connections: Set<string> = new Set();

  static addConnection(socketId: string): void {
    this.connections.add(socketId);
    console.log(`👤 +1 在线 (ID: ${socketId.slice(0,8)}) → 总计: ${this.connections.size}`);
  }

  static removeConnection(socketId: string): void {
    this.connections.delete(socketId);
    console.log(`👋 -1 离线 (ID: ${socketId.slice(0,8)}) → 总计: ${this.connections.size}`);
  }

  static getCount(): number {
    return this.connections.size;
  }

  static getAll(): string[] {
    return Array.from(this.connections);
  }
}

export default router;

