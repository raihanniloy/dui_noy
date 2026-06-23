// src/ui/dom/tableBridge.ts — promise handshakes between Phaser scenes and the DOM controller.
import type { TableView } from './types';

let bootResolve: (() => void) | null = null;
const bootPromise = new Promise<void>((r) => { bootResolve = r; });
export function bootReady(): void { bootResolve?.(); bootResolve = null; }
export function whenBootReady(): Promise<void> { return bootPromise; }

let tableResolve: ((t: TableView) => void) | null = null;
let tablePromise = new Promise<TableView>((r) => { tableResolve = r; });
export function tableReady(t: TableView): void { tableResolve?.(t); tableResolve = null; }
export function whenTableReady(): Promise<TableView> { return tablePromise; }
export function resetTableBridge(): void {
  tablePromise = new Promise<TableView>((r) => { tableResolve = r; });
}
