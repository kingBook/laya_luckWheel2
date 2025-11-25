import { LuckWheel, LuckWheelMode } from "./luckWheel/LuckWheel";


const { regClass, property } = Laya;

@regClass()
export class TestDoubleRotate extends Laya.Script {

    private _luckWheelOutside: LuckWheel;
    private _luckWheelInner: LuckWheel;

    public onAwake(): void {
        this._luckWheelOutside = this.owner.getChildByPath("WheelGroup.LuckWheelOutside").getComponent(LuckWheel);
        this._luckWheelInner = this.owner.getChildByPath("WheelGroup.LuckWheelInner").getComponent(LuckWheel);
        this._luckWheelInner.owner.on(LuckWheel.EVENT_ROTATION_COMPLETE, this, this.onInnerWheelRotationComplete);
        this._luckWheelOutside.owner.on(LuckWheel.EVENT_ROTATION_COMPLETE, this, this.onOutsideWheelRotationComplete);
    }

    public onKeyDown(evt: Laya.Event): void {
        if (evt.keyCode === Laya.Keyboard.J) {
            // 内幸运轮，设置奖励索引
            const innerRewardIndex: number = Math.trunc(Math.random() * this._luckWheelInner.currentOutsideSplitData.splitAngles.length);
            this._luckWheelInner.pointerRotationalObject.aniTotalTime = 7000;
            this._luckWheelInner.pointerRotationalObject.circles = 5;
            this._luckWheelInner.setRewardIndex(innerRewardIndex);
            const innerRewardAngle = this._luckWheelInner.pointerRotationalObject.rewardAngle360;
            console.log("内幸运轮，设置奖励索引：", innerRewardIndex, "奖励角:", innerRewardAngle);

            // 外幸运轮，设置奖励索引
            this._luckWheelOutside.setPointerAngle(innerRewardAngle);
            this._luckWheelOutside.outsideRotationalObject.aniTotalTime = 8000;
            this._luckWheelOutside.outsideRotationalObject.circles = 6;
            const outsideRewardIndex: number = Math.trunc(Math.random() * this._luckWheelOutside.currentOutsideSplitData.splitAngles.length);
            this._luckWheelOutside.setRewardIndex(outsideRewardIndex);
            console.log("外幸运轮，设置奖励索引：", outsideRewardIndex, "pointerAngle:", this._luckWheelOutside.pointerAngle);
        }
    }

    private onInnerWheelRotationComplete(): void {
        console.log(`内幸运轮，旋转结束, 奖励索引为：${this._luckWheelInner.outsideRewardIndex}`);
    }

    private onOutsideWheelRotationComplete(): void {
        console.log(`外幸运轮，旋转结束, 奖励索引为：${this._luckWheelOutside.outsideRewardIndex}`);
    }

    public onDestroy(): void {
        this._luckWheelInner.owner.off(LuckWheel.EVENT_ROTATION_COMPLETE, this, this.onInnerWheelRotationComplete);
        this._luckWheelOutside.owner.off(LuckWheel.EVENT_ROTATION_COMPLETE, this, this.onInnerWheelRotationComplete);
    }
}