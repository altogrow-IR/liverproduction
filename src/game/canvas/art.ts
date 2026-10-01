export function polygon(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
export function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}
export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size = 11,
  color = "#35415b",
  bold = false,
  maxWidth?: number,
) {
  ctx.font = `${bold ? 700 : 500} ${size}px "Segoe UI", "Yu Gothic", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(value, x, y, maxWidth);
}
export function mini(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  frame = 0,
  selected = false,
  male = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#48596d26";
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = "#ed7fa8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 3, 16, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.translate(0, -Math.abs(Math.sin(frame)) * 2);
  round(ctx, -8, -14, 6, 15, 2, "#42516b");
  round(ctx, 2, -14, 6, 15, 2, "#42516b");
  round(ctx, -11, -27, 22, 18, 6, color);
  round(ctx, -15, -24, 5, 12, 3, "#ffdfca");
  round(ctx, 10, -24, 5, 12, 3, "#ffdfca");
  round(ctx, -15, -53, 30, 33, 12, color);
  round(ctx, -11, -46, 23, 22, 9, "#ffe1cf");
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-2, -43, 12, Math.PI, Math.PI * 2);
  ctx.fill();
  if (!male)
    polygon(
      ctx,
      [
        [-13, -42],
        [1, -48],
        [-3, -36],
      ],
      color,
    );
  round(ctx, -7, -37, 3, 5, 1, "#3d405b");
  round(ctx, 5, -37, 3, 5, 1, "#3d405b");
  round(ctx, -10, -31, 5, 2, 1, "#ed9eae");
  round(ctx, 7, -31, 5, 2, 1, "#ed9eae");
  ctx.strokeStyle = "#a06b74";
  ctx.beginPath();
  ctx.arc(1, -31, 3, 0, Math.PI);
  ctx.stroke();
  round(ctx, -5, -24, 10, 3, 1, "#fff7eb");
  if (!male)
    polygon(
      ctx,
      [
        [10, -47],
        [18, -52],
        [16, -40],
      ],
      "#fff1ae",
    );
  ctx.restore();
}
export function plant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  polygon(
    ctx,
    [
      [-8, 0],
      [8, 0],
      [6, 13],
      [-6, 13],
    ],
    "#dca98c",
  );
  ctx.strokeStyle = "#748d62";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -24);
  ctx.stroke();
  for (const [a, b, c] of [
    [-6, -12, -0.7],
    [6, -20, 0.7],
    [-5, -29, -0.7],
    [6, -34, 0.6],
  ]) {
    ctx.save();
    ctx.translate(a, b);
    ctx.rotate(c);
    ctx.fillStyle = b < -20 ? "#73ad86" : "#87bd8f";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
