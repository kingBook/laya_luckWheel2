import LuckWheelUtil from "../LuckWheelUtil";
import { LuckWheelGizmoConfig } from "./LuckWheelGizmoConfig";

/**
 * 自定义 splitAngles (分割线角度列表) 属性在编辑器属性设置面板中的显示
 */
@IEditor.inspectorField("LuckWheel.SplitAnglesPropertyField")
export class SplitAnglesPropertyField extends IEditor.ArrayField {

    public override create(): IEditor.IPropertyFieldCreateResult {
        const superResult = super.create();
        const buttons = superResult.ui.getChild("buttons");

        // 创建 'Create Child' 按钮
        const btnCreateChild = IEditor.GUIUtils.createButton();
        const lastChild = buttons.getChildAt(buttons.numChildren - 1);
        btnCreateChild.x = lastChild.x + lastChild.width;
        btnCreateChild.getChild("title").text = "Create Child";
        buttons.addChild(btnCreateChild);
        btnCreateChild.on("click", this.onClickBtnCreateChild, this);

        // 创建 'Copy' 按钮
        const btnCopyValues = IEditor.GUIUtils.createButton();
        btnCopyValues.x = btnCreateChild.x + btnCreateChild.width;
        btnCopyValues.getChild("title").text = "Copy";
        btnCopyValues.width = 40;
        buttons.addChild(btnCopyValues);
        btnCopyValues.on("click", this.onClickBtnCopyValues, this);

        // 创建 'Paste' 按钮
        const btnPasteValues = IEditor.GUIUtils.createButton();
        btnPasteValues.x = btnCopyValues.x + btnCopyValues.width;
        btnPasteValues.getChild("title").text = "Paste";
        btnPasteValues.width = 40;
        buttons.addChild(btnPasteValues);
        btnPasteValues.on("click", this.onClickBtnPasteValues, this);
        
        return superResult;
    }

    /** 点击 'Create' 按钮时调度 */
    private onClickBtnCreateChild(evt: gui.Event): void {
        const selection: IEditor.IMyNode = Editor.scene.getSelection()[0];
        const luckWheel = this.getComponent(selection, "LuckWheel");

        if (!luckWheel) return;
        const watchProp = this.target.owner.parent.parent.watchProps[0];

        // 创建转盘分割区域的 child
        if (watchProp === "outsideSplitDatas") {
            this.createOutsideChild(selection, luckWheel);
        } else if (watchProp === "innerSplitDatas") {
            this.createInnerChild(selection, luckWheel);
        }
    }

    /** 点击 'Copy' 按钮时调度 */
    private onClickBtnCopyValues(evt: gui.Event): void {
        // 将一个角度值列表写入到剪切板
        const angles: number[] = this.target.datas[0];
        let text: string = "";
        for (let i = 0, len = angles.length; i < len; i++) {
            text = text.concat(`${angles[i]}${i < len - 1 ? ", " : ""}`);
        }
        Editor.clipboard.writeText(text, "clipboard");
    }

    /** 点击 'Paste Values' 按钮时调度 */
    private onClickBtnPasteValues(evt: gui.Event): void {
        const selection: IEditor.IMyNode = Editor.scene.getSelection()[0];
        const luckWheel = this.getComponent(selection, "LuckWheel");
        if (!luckWheel) return;

        // 从剪贴板读取文本
        const text = Editor.clipboard.readText("clipboard");

        // 解析为数字数组
        const newAngles: number[] = text.split(",").map(item => parseFloat(item));
        if (!newAngles || newAngles.length <= 0) return;
        const hasNaN = newAngles.findIndex(item => isNaN(item)) > -1;
        if (hasNaN) return;

        const watchProp = this.target.owner.parent.parent.watchProps[0];
        const splitDatasIndex = parseInt(this.target.owner.parent.watchProps[0]);

        const propMap: any = {
            outsideSplitDatas: "outsideSplitDatas",
            innerSplitDatas: "innerSplitDatas"
        };
        const splitDatas = luckWheel.props[propMap[watchProp]];
        if (splitDatas && splitDatas[splitDatasIndex]) {
            // 赋值
            splitDatas[splitDatasIndex].splitAngles = newAngles;
            // 刷新界面数据
            this.refresh();
        }
    }

    /** 创建外转盘角度分割区域的 child */
    private async createOutsideChild(parent: IEditor.IMyNode, luckWheel: IEditor.IMyComponent): Promise<IEditor.IMyNode> {
        const splitAngles = this.target.datas[0];
        const angleOffset = this.target.owner.parent.target.datas[0].angleOffset;
        const childName = "OutsideChild" + this.target.owner.parent.target.owner.watchProps[0];
        const outsideChild = await this.createChild(parent, angleOffset, splitAngles, luckWheel.props._gizmoOutsideRadius, childName, LuckWheelGizmoConfig.outsideLineColor, LuckWheelGizmoConfig.outsideFillColor);

        // 分割的区块索引数字
        const radius = luckWheel.props._gizmoOutsideRadius * 0.8; // 数字显示在圆内，半径不取全长
        const splitPositions: number[] = LuckWheelUtil.getSplitPositions(angleOffset, splitAngles, radius);
        this.createNumberTexts(outsideChild, splitPositions, radius, LuckWheelGizmoConfig.outsideLineColor);
        return outsideChild;
    }

    /** 创建内转盘角度分割区域的 child */
    private async createInnerChild(parent: IEditor.IMyNode, luckWheel: IEditor.IMyComponent): Promise<IEditor.IMyNode> {
        const splitAngles = this.target.datas[0];
        const angleOffset = this.target.owner.parent.target.datas[0].angleOffset;
        const childName = "InnerChild" + this.target.owner.parent.target.owner.watchProps[0];
        const innerChild = await this.createChild(parent, angleOffset, splitAngles, luckWheel.props._gizmoInnerRadius, childName, LuckWheelGizmoConfig.innerLineColor, LuckWheelGizmoConfig.innerFillColor);

        // 分割的区块索引数字
        const radius = luckWheel.props._gizmoInnerRadius * 0.8; // 数字显示在圆内，半径不取全长
        const splitPositions: number[] = LuckWheelUtil.getSplitPositions(angleOffset, splitAngles, radius);
        this.createNumberTexts(innerChild, splitPositions, radius, LuckWheelGizmoConfig.innerLineColor);
        return innerChild;
    }

    /** 创建一个角度分割区域的 child */
    private async createChild(parent: IEditor.IMyNode, angleOffset: number, splitAngles: number[], radius: number, childName: string, lineColor: string, fillColor: string): Promise<IEditor.IMyNode> {
        const node = await Editor.scene.createNode("Sprite");

        // 多边形 graphics 绘图命令
        const polyCmd = {
            fillColor: fillColor,
            lineColor: lineColor,
            lineWidth: LuckWheelGizmoConfig.lineWidth,
            points: [0, 0],
            x: radius,
            y: radius,
            _$type: "DrawPolyCmd"
        }
        this.getSplitPolygonPoints(angleOffset, splitAngles, radius, polyCmd.points); // 设置多边形顶点
        // 0 度直线 graphics 绘图命令
        const zeroDeglineCmd = {
            _$type: "DrawLineCmd",
            fromX: 0.5,
            fromY: 0.5,
            toX: 1.05,
            toY: 0.5,
            percent: true,
            lineWidth: LuckWheelGizmoConfig.lineWidth,
            lineColor: LuckWheelGizmoConfig.zeroDegLineColor
        }
        node.props._gcmds = [polyCmd, zeroDeglineCmd];

        node.props.name = childName;
        node.props.width = radius * 2;
        node.props.height = radius * 2;
        node.props.anchorX = 0.5;
        node.props.anchorY = 0.5;
        node.props.x = parent.props.pivotX;
        node.props.y = parent.props.pivotY;

        parent.addChild(node);
        return node;
    }

    /** 创建分割的区块索引数字 */
    private async createNumberTexts(parent: IEditor.IMyNode, splitPositions: number[], radius: number, textColor: string): Promise<any> {
        for (let i = 0, len = splitPositions.length; i < len; i += 2) {
            const x = splitPositions[i] + parent.props.width * parent.props.anchorX;
            const y = splitPositions[i + 1] + parent.props.height * parent.props.anchorY;
            const i2 = Math.trunc((i + 1) / 2);

            const textNode = await Editor.scene.createNode("Text");
            textNode.props.align = "center";
            textNode.props.fontSize = LuckWheelGizmoConfig.indexNumberFontSize * radius * 0.015; // 字体大小与圆大小成正比
            textNode.props.height = textNode.props.fontSize;
            textNode.props.color = textColor;
            textNode.props.anchorX = 0.5;
            textNode.props.anchorY = 0.5;
            textNode.props.name = `${i2}`;
            textNode.props.text = `${i2}`;
            textNode.props.x = x;
            textNode.props.y = y;

            parent.addChild(textNode);
        }
    }

    /** 根据组件类型名称获取组件 */
    private getComponent(node: IEditor.IMyNode, type: string): IEditor.IMyComponent {
        for (let key in node.components) {
            const comp = node.components[key];
            const scriptPath: string = comp.props.scriptPath;
            if (!scriptPath) continue;
            const foundId = scriptPath.lastIndexOf(`${type}.ts`);
            if (foundId < 0) continue;
            return comp;
        }
        return null;
    }

    /** 获取要绘制的分割线列表的多边形顶点 */
    private getSplitPolygonPoints(angleOffset: number, splitAngles: number[], radius: number, out?: number[]): number[] {
        out ||= [];
        out.length = 0; // 清空

        let angleIndex = 0; // 分割线角度数组的索引

        for (let i = 0; i < 360; i++) {
            let rad = (i + angleOffset) * Math.PI / 180;
            let x = Math.cos(rad) * radius;
            let y = Math.sin(rad) * radius;
            out.push(x, y);

            // 距离分割线角<=1度，则添加分割线点
            if (angleIndex < splitAngles.length && splitAngles[angleIndex] - i <= 1) {
                rad = (splitAngles[angleIndex] + angleOffset) * Math.PI / 180;
                x = Math.cos(rad) * radius;
                y = Math.sin(rad) * radius;
                out.push(x, y);
                out.push(0, 0);
                out.push(x, y);
                angleIndex++;
            }
        }
        return out;
    }

}