const { regClass, property } = Laya;

/** 盘面的分割数据 */
@regClass()
export class SplitData {

    /** 盘面上的物品容器, 必须是转盘(outsideDisc 或 innerDisc)的子级, 当有多组分割数据时, 会自动显示或隐藏此容器, 当用代码动态放置物品时，此属性可为空*/
    @property({ type: Laya.Sprite, tips: "盘面上的物品容器, 必须是转盘(outsideDisc 或 innerDisc)的子级, 当有多组分割数据时, 会自动显示或隐藏此容器, 当用代码动态放置物品时，此属性可为空" })
    public itemsContainer: Laya.Sprite;

    @property({ type: Number, range: [-180, 180], step: 0.1, tips: "盘面的偏移角度 [-180, 180]" })
    public angleOffset: number = 0;

    /** 分割线角度列表，角度区间为：[0, 359] 小 -> 大 */
    @property({ type: [Number], inspector: "LuckWheel.SplitAnglesPropertyField", minArrayLength: 2, elementProps: { step: 0.1, fractionDigits: 1, range: [0, 359] }, onChange: "onChangeSplitAngles", tips: "转盘的分割线角度列表，角度区间为：[0, 359] 小->大" })
    public splitAngles: number[] = [0, 180];

    /** 仅用于编辑器，在编辑器中改变 splitAngles 属性时的回调，用于限制角度输入 */
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
}