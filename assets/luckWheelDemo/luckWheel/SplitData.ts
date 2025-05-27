const { regClass, property } = Laya;

/** 盘面的分割数据 */
@regClass()
export class SplitData {

    /** 盘面上的物品容器 */
    @property({ type: Laya.Sprite, tips: "盘面上的物品容器" })
    public itemsContainer: Laya.Sprite;

    /** 分割线角度列表，角度区间为：[0, 359] 小 -> 大 */
    @property({ type: [Number], inspector: "LuckWheel.SplitAnglesPropertyField", minArrayLength: 2, elementProps: { step: 0.1, fractionDigits: 1, range: [0, 359] }, onChange: "onChangeSplitAngles", tips: "转盘的分割线角度列表，角度区间为：[0, 359] 小 -> 大" })
    public splitAngles: number[] = [0, 180];

    // ===================== Inspector Callback start =============
    private onChangeSplitAngles(key?: string): void {
        if (!key) return;
        let i = parseInt(key);
        if (i > 0) {
            let prev = this.splitAngles[i - 1];
            let current = this.splitAngles[i];
            if (current <= prev) {
                // 限制编辑器修改分割线角度时，不能大于上一个
                this.splitAngles[i] = Math.min(prev + 1, 359);
            }
        }
    }
    // ===================== Inspector Callback end =============
}