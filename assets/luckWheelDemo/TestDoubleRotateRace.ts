import { LuckWheel, LuckWheelMode } from "./luckWheel/LuckWheel";


const { regClass, property } = Laya;

@regClass()
export class TestDoubleRotateRace extends Laya.Script {

    private _luckWheelOutside: LuckWheel;
    private _luckWheelInner: LuckWheel;

    public onAwake(): void {
        this._luckWheelOutside = this.owner.getChildByPath("WheelGroup.LuckWheelOutside").getComponent(LuckWheel);
        this._luckWheelInner = this.owner.getChildByPath("WheelGroup.LuckWheelInner").getComponent(LuckWheel);
        this._luckWheelInner.owner.on(LuckWheel.EVENT_ROTATION_COMPLETE, this, this.onInnerWheelRotationComplete);
        this._luckWheelOutside.owner.on(LuckWheel.EVENT_ROTATION_COMPLETE, this, this.onOutsideWheelRotationComplete);
    }

    public onKeyDown(evt: Laya.Event): void {
        if (evt.keyCode === Laya.Keyboard.H) {
            this._luckWheelInner.startRotation();
            this._luckWheelOutside.startRotation();
            console.log("双幸运轮，开始旋转");
        } else if (evt.keyCode === Laya.Keyboard.J) {
            if (this._luckWheelInner.isRotating) {
                // 内幸运轮，设置奖励索引
                const innerRewardIndex: number = Math.trunc(Math.random() * this._luckWheelInner.currentOutsideSplitData.splitAngles.length);
                this._luckWheelInner.setRewardIndex(innerRewardIndex);

                const innerRewardAngle = this._luckWheelInner.pointerRotationalObject.rewardAngle;
                console.log("内幸运轮，设置奖励索引：", innerRewardIndex, "奖励角:", innerRewardAngle);

                Laya.timer.once(2000, this, () => {
                    if (this._luckWheelOutside.isRotating) {
                        // 外幸运轮，设置奖励索引
                        this._luckWheelOutside.setPointerAngle(innerRewardAngle);
                        const outsideRewardIndex: number = Math.trunc(Math.random() * this._luckWheelOutside.currentOutsideSplitData.splitAngles.length);
                        this._luckWheelOutside.setRewardIndex(outsideRewardIndex);
                        console.log("外幸运轮，设置奖励索引：", outsideRewardIndex, "pointerAngle:", this._luckWheelOutside.pointerAngle);
                    }
                });
            }

        } else if (evt.keyCode === Laya.Keyboard.U) {
            // 随机取一个奖励角
          /*  const randomRewardAngle: number = Math.trunc(Math.random() * 360);
            if (this._luckWheelInner.isRotating) {
                // 以白线为 0 度，顺时针
                //const rewardAngle = randomRewardAngle - this._luckWheelInner.currentOutsideSplitData.angleOffset;
                // 以第一条分割线为 0 度，顺时针
                const rewardAngle = randomRewardAngle + this._luckWheelInner.currentOutsideSplitData.splitAngles[0];
                const rewardIndex = this._luckWheelInner.getOutsideIndexByAngle(rewardAngle);
                console.log(`内幸运轮，设置奖励角:${randomRewardAngle}，索引:${rewardIndex}`);
                // 内幸运轮，设置奖励角
                this._luckWheelInner.setRewardIndex(rewardIndex);
            } else if (this._luckWheelOutside.isRotating) {
                // 以白线为 0 度，顺时针
                //const rewardAngle = randomRewardAngle - this._luckWheelOutside.currentOutsideSplitData.angleOffset;
                // 以第一条分割线为 0 度，顺时针
                const rewardAngle = randomRewardAngle + this._luckWheelOutside.currentOutsideSplitData.splitAngles[0];
                const rewardIndex = this._luckWheelOutside.getOutsideIndexByAngle(rewardAngle);
                console.log(`外幸运轮，设置奖励角:${randomRewardAngle}，索引:${rewardIndex}`);
                // 外幸运轮，设置奖励角
                this._luckWheelOutside.setRewardIndex(rewardIndex);
            }*/
        } else if (evt.keyCode === Laya.Keyboard.M) {
            // 随机取一个奖励角
           /* const randomRewardAngle: number = Math.trunc(Math.random() * 360);
            if (this._luckWheelInner.isRotating) {
                console.log(`内幸运轮，设置奖励角:${randomRewardAngle}`);
                // 内幸运轮，设置奖励角
                this._luckWheelInner.setRewardAngle(randomRewardAngle);
            } else if (this._luckWheelOutside.isRotating) {
                console.log(`外幸运轮，设置奖励角:${randomRewardAngle}`);
                // 外幸运轮，设置奖励角
                this._luckWheelOutside.setRewardAngle(randomRewardAngle);
            }*/
        }
    }

    private onInnerWheelRotationComplete(): void {
        console.log(`内幸运轮，旋转结束, 奖励索引为：${this._luckWheelInner.outsideRewardIndex}`);
        //console.log("外幸运轮，开始旋转");
        //this._luckWheelOutside.startRotating();
    }

    private onOutsideWheelRotationComplete(): void {
        console.log(`外幸运轮，旋转结束, 奖励索引为：${this._luckWheelOutside.outsideRewardIndex}`);
    }

    public onDestroy(): void {
        this._luckWheelInner.owner.off(LuckWheel.EVENT_ROTATION_COMPLETE, this, this.onInnerWheelRotationComplete);
        this._luckWheelOutside.owner.off(LuckWheel.EVENT_ROTATION_COMPLETE, this, this.onInnerWheelRotationComplete);
    }
}