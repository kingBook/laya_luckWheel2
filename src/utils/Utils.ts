export default class Utils {
    
    /**
     * 创建自定义贝塞尔缓动
     * @param t 0~1
     * @param p1x 
     * @param p1y 
     * @param p2x 
     * @param p2y 
     * @description 工具推荐：https://cubic-bezier.com/ （拖拽生成控制点，复制数字直接用）, 如：创建自定义贝塞尔缓动（控制点：P1(0.25, 0.1), P2(0.25, 1) —— 标准 easeOut）
     * @returns 
     */
    static createBezierEase(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {

        /**
         * 三次贝塞尔曲线计算函数（核心）
         * @param t 0~1
         * @param p1x 
         * @param p1y 
         * @param p2x 
         * @param p2y 
         * @returns 
         */
        const cubicBezier = (t: number, p1x: number, p1y: number, p2x: number, p2y: number): number => {
            // 贝塞尔曲线参数方程（t: 0~1）
            let u = 1 - t;
            let tt = t * t;
            let uu = u * u;
            let uuu = uu * u;
            let ttt = tt * t;

            // 计算 X 和 Y 的加权平均
            let x = uuu * 0 + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * 1;
            let y = uuu * 0 + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * 1;

            // 二分法求逆（找到 t' 使得 x(t') = t）
            let a = 0, b = 1;
            for (let i = 0; i < 8; i++) {  // 迭代 8 次，精度足够
                let mid = (a + b) / 2;
                let midX = cubicBezierX(mid, p1x, p2x);  // 只计算 X
                if (midX < t) {
                    a = mid;
                } else {
                    b = mid;
                }
            }
            let finalT = (a + b) / 2;
            return cubicBezierY(finalT, p1y, p2y);  // 返回对应的 Y
        }

        /**
         * 辅助函数：只计算 X（用于逆向求解）
         * @param t 0~1
         * @param p1x 
         * @param p2x 
         * @returns 
         */
        const cubicBezierX = (t: number, p1x: number, p2x: number): number => {
            let u = 1 - t;
            let tt = t * t;
            let uu = u * u;
            let uuu = uu * u;
            let ttt = tt * t;
            return 3 * uu * t * p1x + 3 * u * tt * p2x + ttt;
        }

        /**
         * 辅助函数：只计算 Y
         * @param t 0~1
         * @param p1y 
         * @param p2y 
         * @returns 
         */
        const cubicBezierY = (t: number, p1y: number, p2y: number): number => {
            let u = 1 - t;
            let tt = t * t;
            let uu = u * u;
            let uuu = uu * u;
            let ttt = tt * t;
            return 3 * uu * t * p1y + 3 * u * tt * p2y + ttt;
        }

        return cubicBezier(t, p1x, p1y, p2x, p2y);
    }
}