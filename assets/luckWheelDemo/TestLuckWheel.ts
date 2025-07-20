import { LuckWheel, LuckWheelMode } from "./luckWheel/LuckWheel";


const { regClass, property } = Laya;

@regClass()
export class TestLuckWheel extends Laya.Script {

    private _luckWheel: LuckWheel;

    public onAwake(): void {
        this._luckWheel = this.owner.getChild("LuckWheel").getComponent(LuckWheel);
        this._luckWheel.owner.on(LuckWheel.ROTATE_END, this, this.onRotateEnd);


    }

    public onKeyDown(evt: Laya.Event): void {
        if (evt.keyCode === Laya.Keyboard.H) {
            this._luckWheel.startRotation();
            console.log("开始旋转");
        } else if (evt.keyCode === Laya.Keyboard.J) {
            // 随机取一个外转盘的开奖结果
            const outsideRewardIndex: number = Math.trunc(Math.random() * this._luckWheel.currentOutsideSplitData.splitAngles.length);
            // 随机取一个内转盘的开奖结果
            const innerRewardIndex: number = Math.trunc(Math.random() * this._luckWheel.currentInnerSplitData.splitAngles.length);
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
        } else if (evt.keyCode === Laya.Keyboard.U) {
            // 随机取一个外转盘的开奖结果
            const outsideRewardAngle: number = Math.trunc(Math.random() * 360);
            // 随机取一个内转盘的开奖结果
            const innerRewardAngle: number = Math.trunc(Math.random() * 360);
            let outsideAngleOffset: number, outsideSplitAngle0: number;
            switch (this._luckWheel.mode) {
                case LuckWheelMode.SingleRotatePointer:
                case LuckWheelMode.SingleFixedPointer:
                    this._luckWheel.setRewardAngle(outsideRewardAngle);
                    outsideAngleOffset = this._luckWheel.currentOutsideSplitData.angleOffset;
                    outsideSplitAngle0 = this._luckWheel.currentOutsideSplitData.splitAngles[0];
                    console.log("得到开奖结果", "外转盘角度:" + outsideRewardAngle, "外转盘索引:" + this._luckWheel.outsideRewardIndex);
                    console.log("outsideAngleOffset:", outsideAngleOffset, "outsideSplitAngle[0]:", outsideSplitAngle0);
                    break;
                case LuckWheelMode.DoubleFixedPointer:
                    this._luckWheel.setRewardAngle(outsideRewardAngle, innerRewardAngle);
                    outsideAngleOffset = this._luckWheel.currentOutsideSplitData.angleOffset;
                    outsideSplitAngle0 = this._luckWheel.currentOutsideSplitData.splitAngles[0];
                    const innerAngleOffset = this._luckWheel.currentOutsideSplitData.angleOffset;
                    const innerSplitAngle0 = this._luckWheel.currentInnerSplitData.splitAngles[0];
                    console.log("得到开奖结果", "外转盘角度:" + outsideRewardAngle, "内转盘角度：" + innerRewardAngle, "外转盘索引：" + this._luckWheel.outsideRewardIndex, "内转盘索引：" + this._luckWheel.innerRewardIndex);
                    console.log("outsideAngleOffset:", outsideAngleOffset, "outsideSplitAngle[0]:", outsideSplitAngle0);
                    console.log("innerAngleOffset:", innerAngleOffset, "innerSplitAngle0:", innerSplitAngle0);


                    break;
            }
        } else if (evt.keyCode === Laya.Keyboard.K) {
            this._luckWheel.setPause(!this._luckWheel.isPausing);
            console.log("设置暂停为：", this._luckWheel.isPausing);
        } else if (evt.keyCode === Laya.Keyboard.L) {
            this._luckWheel.outsideSelectIndex = Math.trunc(Math.random() * this._luckWheel.outsideSplitDatas.length);
            this._luckWheel.innerSelectIndex = Math.trunc(Math.random() * this._luckWheel.innerSplitDatas.length);
            console.log("选择分割数据：", "外转盘：" + this._luckWheel.outsideSelectIndex, "内转盘：" + this._luckWheel.innerSelectIndex);

        }
    }

    private onRotateEnd(): void {
        console.log("旋转结束");
    }

    public onDestroy(): void {
        this._luckWheel.owner.off(LuckWheel.ROTATE_END, this, this.onRotateEnd);
    }
}