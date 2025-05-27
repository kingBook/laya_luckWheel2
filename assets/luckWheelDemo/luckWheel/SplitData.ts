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
        if (i > 0) {
            const prev = this.splitAngles[i - 1];
            let current = this.splitAngles[i];
            const next = i < this.splitAngles.length - 1 ? this.splitAngles[i + 1] : 359;
            // 限制编辑器修改分割线角度时，限制在前后两个之间，且不能大于 359
            current = Math.max(Math.min(prev + 1, 359), current);
            current = Math.min(Math.max(next - 1, 0), current);
        }
    }
    // ===================== Inspector Callback end =============
}