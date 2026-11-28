/**
 * Test image of a surface: a grid, its diagonals and circle, the number and
 * the name, in a color of its own, to line it up with the real surface.
 */

const COLORS = ['#e8b339', '#4aa3ff', '#4fd18b', '#ff6f61', '#c58cff', '#5ad8d8', '#ff9f45', '#f27ab8'];

const SIZE = 512;
const CELLS = 8;

export function testCard(number: number, title: string, name: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext('2d');
    if (context === null) {
        return canvas;
    }
    const color = COLORS[(number - 1) % COLORS.length];
    context.fillStyle = '#101114';
    context.fillRect(0, 0, SIZE, SIZE);
    context.strokeStyle = '#6b6e75';
    context.lineWidth = 2;
    for (let line = 1; line < CELLS; line++) {
        const at = (line * SIZE) / CELLS;
        context.beginPath();
        context.moveTo(at, 0);
        context.lineTo(at, SIZE);
        context.moveTo(0, at);
        context.lineTo(SIZE, at);
        context.stroke();
    }
    context.strokeStyle = color;
    context.lineWidth = 8;
    context.strokeRect(4, 4, SIZE - 8, SIZE - 8);
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(SIZE, SIZE);
    context.moveTo(SIZE, 0);
    context.lineTo(0, SIZE);
    context.stroke();
    context.beginPath();
    context.arc(SIZE / 2, SIZE / 2, SIZE * 0.36, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#101114';
    context.fillRect(SIZE * 0.2, SIZE * 0.34, SIZE * 0.6, SIZE * 0.32);
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '500 96px system-ui, sans-serif';
    context.fillText(String(number), SIZE / 2, SIZE * 0.45);
    context.font = '400 32px system-ui, sans-serif';
    context.fillStyle = '#e6e6e3';
    context.fillText(title, SIZE / 2, SIZE * 0.55, SIZE * 0.56);
    context.fillText(name, SIZE / 2, SIZE * 0.62, SIZE * 0.56);
    return canvas;
}
