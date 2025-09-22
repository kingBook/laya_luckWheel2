export default class LuckWheelUtil {

    /**
     * 获取盘面分割线切分的各个扇形对称轴线的位置
     * @param angleOffset 盘面的偏移角度 [-180, 180]
     * @param splitAngles 分割线角度列表，角度区间为：[0, 359] 小 -> 大
     * @param radius 半径
     * @param centerOffsetPoint 中心偏移
     * @param out 存储输出结果的数组，数组的长度为: {@link splitAngles}.length * 2
     * @returns 返回位置数组，结果以 [x,y,...] 格式存储，数组的长度为: {@link splitAngles}.length * 2, 当 {@link splitAngles} 未定义或长度为 0 时返回空数组
     */
    public static getSplitPositions(angleOffset: number, splitAngles: number[], radius: number, centerOffsetPoint?: { x: number, y: number }, out?: number[]): number[] {
        out ||= [];
        out.length = 0;
        if (!splitAngles || splitAngles.length === 0) return out;

        for (let i = 0, len = splitAngles.length; i < len; i++) {
            const nextI = (i + 1) % len;
            const min = splitAngles[i];
            const max = i >= len - 1 ? (360 + splitAngles[0]) : splitAngles[nextI];
            const rad = ((min + (max - min) * 0.5) + angleOffset) * Math.PI / 180;
            let x = Math.cos(rad) * radius;
            let y = Math.sin(rad) * radius;
            if (centerOffsetPoint) {
                x += centerOffsetPoint.x;
                y += centerOffsetPoint.y;
            }
            out.push(x, y);
        }
        return out;
    }
}