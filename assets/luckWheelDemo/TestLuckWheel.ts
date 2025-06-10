import { LuckWheel, LuckWheelMode } from "./luckWheel/LuckWheel";


const { regClass, property } = Laya;

@regClass()
export class TestLuckWheel extends Laya.Script {

    private _luckWheel: LuckWheel;
    @property({ type: Laya.Prefab })
    spritePrefab: Laya.Prefab;

    public onAwake(): void {
        this._luckWheel = this.owner.parent.getChild("LuckWheel").getComponent(LuckWheel);
        this._luckWheel.owner.on(LuckWheel.ROTATE_END, this, this.onRotateEnd);

       
    }

    public onKeyDown(evt: Laya.Event): void {
        if (evt.keyCode === Laya.Keyboard.H) {
            this._luckWheel.startRotating();
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
        } else if (evt.keyCode === Laya.Keyboard.K) {
            this._luckWheel.setPause(!this._luckWheel.isPausing);
            console.log("设置暂停为：", this._luckWheel.isPausing);
        } else if (evt.keyCode === Laya.Keyboard.L) {
            this._luckWheel.outsideSelectIndex = Math.trunc(Math.random() * this._luckWheel.outsideSplitDatas.length);
            this._luckWheel.innerSelectIndex = Math.trunc(Math.random() * this._luckWheel.innerSplitDatas.length);
            console.log("选择分割数据：", "外转盘：" + this._luckWheel.outsideSelectIndex, "内转盘：" + this._luckWheel.innerSelectIndex);

        }else if(evt.keyCode === Laya.Keyboard.M){
            let poses = this._luckWheel.getOutsideSplitPositions(200, false);
            for (let i = 0; i < poses.length; i += 2) {
                const x = poses[i];
                const y = poses[i + 1];
                let sp = this.spritePrefab.create() as Laya.Sprite;
                sp.pos(x, y);
                this.owner.addChild(sp);
            }
        }
    }

    private onRotateEnd(): void {
        console.log("旋转结束");
    }

    public onDestroy(): void {
        this._luckWheel.owner.off(LuckWheel.ROTATE_END, this, this.onRotateEnd);
    }
}