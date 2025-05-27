import { LuckWheel, LuckWheelMode } from "./luckWheel/LuckWheel";


const { regClass, property } = Laya;

@regClass()
export class TestLuckWheel extends Laya.Script {

    private _luckWheel: LuckWheel;

    public onAwake(): void {
        this._luckWheel = this.owner.parent.getChild("LuckWheel").getComponent(LuckWheel);
        this._luckWheel.owner.on(LuckWheel.ROTATE_END, this, this.onRotateEnd);
    }

    public onKeyDown(evt: Laya.Event): void {
        if (evt.keyCode === Laya.Keyboard.H) { // H
            this._luckWheel.startRotate();
            console.log("开始旋转");
        } else if (evt.keyCode === Laya.Keyboard.J) { // J
            // 随机取一个外转盘的开奖结果
            let outsideRewardIndex: number = Math.trunc(Math.random() * this._luckWheel.outsideSplitDatas[this._luckWheel.outsideTabIndex].splitAngles.length);
            // 随机取一个内转盘的开奖结果
            let innerRewardIndex: number = Math.trunc(Math.random() * this._luckWheel.innerSplitDatas[this._luckWheel.innerTabIndex].splitAngles.length);
            switch (this._luckWheel.mode) {
                case LuckWheelMode.SingleRotatePointer:
                case LuckWheelMode.SingleFixedPointer:
                    this._luckWheel.setRewardIndex(outsideRewardIndex);
                    console.log("得到开奖结果", "外转盘:" + outsideRewardIndex);
                    break;
                case LuckWheelMode.DoubleFixedPointer:
                    this._luckWheel.setRewardIndex(outsideRewardIndex, innerRewardIndex);
                    console.log("得到开奖结果", "外转盘：" + outsideRewardIndex, "内转盘：" + innerRewardIndex);
                    break;
            }
        } else if (evt.keyCode === Laya.Keyboard.K) { // K
            this._luckWheel.setPause(!this._luckWheel.isPausing);
            console.log("设置暂停为：", this._luckWheel.isPausing);
        }
    }

    private onRotateEnd(): void {
        console.log("旋转结束");
    }

    public onDestroy(): void {
        this._luckWheel.owner.off(LuckWheel.ROTATE_END, this, this.onRotateEnd);
    }
}