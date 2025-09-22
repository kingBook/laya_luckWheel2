import { LuckWheel, LuckWheelMode } from "../LuckWheel";
import { LuckWheelGizmoConfig } from "./LuckWheelGizmoConfig";

const { regClass, property } = Laya;

/**
 * 自定义 {@link LuckWheel} 组件的场景视图
 */
@IEditorEnv.customEditor(LuckWheel)
export class LuckWheelEditor extends IEditorEnv.CustomEditor {

    declare owner: Laya.Sprite;

    private _manager: IEditorEnv.IGizmosManager;
    private _luckWheel: LuckWheel;

    private _outsidePolygon: IEditorEnv.IGizmoPolygon;
    private _innerPolygon: IEditorEnv.IGizmoPolygon;
    private _outsideNumberTexts: IEditorEnv.IGizmoText[] = [];
    private _innerNumberTexts: IEditorEnv.IGizmoText[] = [];


    public onDrawGizmosSelected() {
        this._manager = IEditorEnv.Gizmos2D.getManager(this.owner);
        this._luckWheel = this.owner.getComponent(LuckWheel);

        // 清空绘图
        if (this._outsidePolygon) {
            this._outsidePolygon.points.length = 0;
            this._outsidePolygon.refresh();
        }
        if (this._innerPolygon) {
            this._innerPolygon.points.length = 0;
            this._innerPolygon.refresh();
        }
        if (this._outsideNumberTexts.length > 0) {
            for (let i = 0; i < this._outsideNumberTexts.length; i++) {
                this._outsideNumberTexts[i].node.remove();
            }
            this._outsideNumberTexts.length = 0;
        }
        if (this._innerNumberTexts.length > 0) {
            for (let i = 0; i < this._innerNumberTexts.length; i++) {
                this._innerNumberTexts[i].node.remove();
            }
            this._innerNumberTexts.length = 0;
        }

        // _gizmoVisible 为 true 时才在场景视图中显示绘图
        if ((this._luckWheel as any)._gizmoVisible) {
            // 外转盘
            if (this._luckWheel.currentOutsideSplitData && this._luckWheel.currentOutsideSplitData.splitAngles) {
                this.drawOutsideSplitPolygon(); // 绘制多边形
                this.drawOutsideNumberTexts(); // 绘制索引编号
            }

            if (this._luckWheel.mode & LuckWheelMode.DoubleFixedPointer) {
                // 内转盘
                if (this._luckWheel.currentInnerSplitData && this._luckWheel.currentInnerSplitData.splitAngles) {
                    this.drawInnerSplitPolygon(); // 绘制多边形
                    this.drawInnerNumberTexts(); // 绘制索引编号
                }
            }
        }
    }


    /** 绘制外部的多边形 */
    private drawOutsideSplitPolygon(): void {
        // 创建外多边形
        if (!this._outsidePolygon) {
            this._outsidePolygon = this._manager.createPolygon();
            this._outsidePolygon.stroke({ color: LuckWheelGizmoConfig.outsideLineColor, width: LuckWheelGizmoConfig.lineWidth });
            this._outsidePolygon.fill(LuckWheelGizmoConfig.outsideFillColor);
            this._outsidePolygon.touchable = false; // 不可交互
        }
        // 画外分割线
        const { angleOffset, splitAngles } = this._luckWheel.currentOutsideSplitData;
        this.drawSplitLines(this._outsidePolygon, angleOffset, splitAngles, (this._luckWheel as any)._gizmoOutsideRadius);
    }

    /** 绘制内部的多边形 */
    private drawInnerSplitPolygon(): void {
        // 创建内多边形
        if (!this._innerPolygon) {
            this._innerPolygon = this._manager.createPolygon();
            this._innerPolygon.stroke({ color: LuckWheelGizmoConfig.innerLineColor, width: LuckWheelGizmoConfig.lineWidth });
            this._innerPolygon.fill(LuckWheelGizmoConfig.innerFillColor);
            this._innerPolygon.touchable = false; // 不可交互
        }
        // 画内分割线
        const { angleOffset, splitAngles } = this._luckWheel.currentInnerSplitData;
        this.drawSplitLines(this._innerPolygon, angleOffset, splitAngles, (this._luckWheel as any)._gizmoInnerRadius);
    }

    /** 绘制区块分割线 */
    private drawSplitLines(polygon: IEditorEnv.IGizmoPolygon, angleOffset: number, splitAngles: number[], radius: number): void {
        polygon.points.length = 0; // 清空

        let angleIndex = 0; // 分割线角度数组的索引

        for (let i = 0; i < 360; i++) {
            let rad = Laya.Utils.toRadian(i + angleOffset);
            let x = Math.cos(rad) * radius * this.owner.globalScaleX;
            let y = Math.sin(rad) * radius * this.owner.globalScaleY;
            polygon.points.push(x, y);

            // 距离分割线角<=1度，则添加分割线点
            if (angleIndex < splitAngles.length && splitAngles[angleIndex] - i <= 1) {
                rad = Laya.Utils.toRadian(splitAngles[angleIndex] + angleOffset);
                x = Math.cos(rad) * radius * this.owner.globalScaleX;
                y = Math.sin(rad) * radius * this.owner.globalScaleY;
                polygon.points.push(x, y);
                polygon.points.push(0, 0);
                polygon.points.push(x, y);
                angleIndex++;
            }
        }

        polygon.refresh();
        polygon.setLocalPos(this.owner.pivotX, this.owner.pivotY);
    }

    /** 绘制外多边形的索引编号 */
    private drawOutsideNumberTexts(): void {
        const radius = (this._luckWheel as any)._gizmoOutsideRadius * 0.8; // 数字显示在圆内，半径不取全长
        const splitPositions: number[] = this._luckWheel.getOutsideSplitPositions(radius, false); // 外转盘各分块的中线点列表
        this.drawNumberTexts(splitPositions, radius, LuckWheelGizmoConfig.outsideLineColor, this._outsideNumberTexts);
    }

    /** 绘制内多边形的索引编号 */
    private drawInnerNumberTexts(): void {
        const radius = (this._luckWheel as any)._gizmoInnerRadius * 0.8; // 数字显示在圆内，半径不取全长
        const splitPositions: number[] = this._luckWheel.getInnerSplitPositions(radius, false); // 内转盘各分块的中线点列表
        this.drawNumberTexts(splitPositions, radius, LuckWheelGizmoConfig.innerLineColor, this._innerNumberTexts);
    }

    /** 绘制索引编号 */
    private drawNumberTexts(splitPositions: number[], radius: number, textColor: string, outTexts: IEditorEnv.IGizmoText[]): void {
        for (let i = 0, len = splitPositions.length; i < len; i += 2) {
            const x = splitPositions[i] + this.owner.pivotX;
            const y = splitPositions[i + 1] + this.owner.pivotY;
            const i2 = Math.trunc((i + 1) / 2);

            let text = outTexts[i2];
            if (!text) {
                text = this._manager.createText(i2.toString());
                text.fill(textColor);
                text.setFontProp("size", LuckWheelGizmoConfig.indexNumberFontSize * radius * this.owner.globalScaleX * 0.015); // 字体大小与圆大小成正比
                text.touchable = false;
                outTexts[i2] = text;
            }
            text.setLocalPos(x, y);
        }
    }
}