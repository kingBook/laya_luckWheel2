const { regClass, property } = Laya;

/** 盘面的分割数据 */
@regClass()
export class SplitData {

    /** 盘面上的物品容器 */
    @property({ type: Laya.Sprite, tips: "盘面上的物品容器" })
    public itemsContainer: Laya.Sprite;

    /** 分割线角度列表，角度区间为：[0, 359] 小 -> 大 */
    @property({ type: [Number], inspector: "LuckWheel.SplitAnglesPropertyField", minArrayLength: 2, elementProps: { step: 0.1, fractionDigits: 1, range: [0, 359] }, onChange: "onChangeSplitAngles", tips: "转盘的分割线角度列表，角度区间为：[0, 359] 小->大" })
    public splitAngles: number[] = [0, 180];

    // ===================== Inspector Callback start =============
    private onChangeSplitAngles(key?: string): void {
        if (!key) return;
        const i = parseInt(key);
        let current = this.splitAngles[i];

        // 限制大于上一个
        if (i > 0) {
            let prev = this.splitAngles[i - 1];
            prev = Math.min(prev + 1, 359); // 上限 359
            current = Math.max(prev, current);
        }

        // 限制小于下一个
        if (i < this.splitAngles.length - 1) {
            let next = this.splitAngles[i + 1];
            next = Math.max(next - 1, 0); // 下限 0
            current = Math.min(next, current);
        }

        this.splitAngles[i] = current;
    }
    // ===================== Inspector Callback end =============
}