import { LuckWheelGizmoConfig } from "./LuckWheelGizmoConfig";

/**
 * 自定义 '分割线角度列表' 的 Inspector 字段编辑
 */
@IEditor.inspectorField("LuckWheel.SplitAnglesPropertyField")
export class SplitAnglesPropertyField extends IEditor.ArrayField {

    public override create(): IEditor.IPropertyFieldCreateResult {
        let superResult = super.create();
        let buttons = superResult.ui.getChild("buttons");

        // 创建 'Create Child' 按钮
        let btnCreateChild = IEditor.GUIUtils.createButton();
        let lastChild = buttons.getChildAt(buttons.numChildren - 1);
        btnCreateChild.x = lastChild.x + lastChild.width;
        btnCreateChild.getChild("title").text = "Create Child";
        buttons.addChild(btnCreateChild);
        btnCreateChild.on("click", this.onClickBtnCreateChild, this);

        // 创建 'Copy Values' 按钮
        let btnCopyValues = IEditor.GUIUtils.createButton();
        btnCopyValues.x = btnCreateChild.x + btnCreateChild.width;
        btnCopyValues.getChild("title").text = "Copy Values";
        buttons.addChild(btnCopyValues);
        btnCopyValues.on("click", this.onClickBtnCopyValues, this);

        return superResult;
    }

    public refresh(): void {

    }

    /** 点击 'Create Child' 按钮时调度 */
    private onClickBtnCreateChild(evt: gui.Event): void {
        let selection: IEditor.IMyNode = Editor.scene.getSelection()[0];

        let luckWheel = this.getComponent(selection, "LuckWheel");
        if (luckWheel) {
            let watchProp = this.target.owner.watchProps[0];
            // 创建转盘分割区域的 child
            if (watchProp === "outsideSplitAngles") {
                this.createOutsideChild(selection, luckWheel);
            } else if (watchProp === "innerSplitAngles") {
                this.createInnerChild(selection, luckWheel);
            }
        } else {
            console.error("找不到 LuckWheel 组件");
        }
    }

    /** 点击 'Copy Values' 按钮时调度 */
    private onClickBtnCopyValues(evt: gui.Event): void {
        let selection: IEditor.IMyNode = Editor.scene.getSelection()[0];

        let luckWheel = this.getComponent(selection, "LuckWheel");
        if (luckWheel) {
            let watchProp = this.target.owner.watchProps[0];
            // 将角度分割线列表的值写入剪切版
            if (watchProp === "outsideSplitAngles") {
                this.writeAnglesToClipboard(luckWheel.props.outsideSplitAngles);
            } else if (watchProp === "innerSplitAngles") {
                this.writeAnglesToClipboard(luckWheel.props.innerSplitAngles);
            }
        }
    }

    /** 将一个角度值列表写入到剪切版 */
    private writeAnglesToClipboard(angles: number[]): void {
        let text: string = "";
        for (let i = 0, len = angles.length; i < len; i++) {
            text = text.concat(`${angles[i]}${i < len - 1 ? ", " : ""}`);
        }
        Editor.clipboard.writeText(text, "clipboard");
    }

    /** 创建外转盘角度分割区域的 child */
    private async createOutsideChild(selection: IEditor.IMyNode, luckWheel: IEditor.IMyComponent): Promise<IEditor.IMyNode> {
        let outsideChild = await this.createChild(selection, luckWheel.props.outsideSplitAngles, luckWheel.props.gizmoOutsideRadius, "OutsideChild", LuckWheelGizmoConfig.outsideLineColor, LuckWheelGizmoConfig.outsideFillColor);

        // 分割的区块索引数字
        let radius = luckWheel.props.gizmoOutsideRadius * 0.8; // 数字显示在圆内，半径不取全长
        let splitPositions: number[] = this.getSplitPositions(luckWheel.props.outsideSplitAngles, radius);
        this.createNumberTexts(outsideChild, splitPositions, radius, LuckWheelGizmoConfig.outsideLineColor);
        return outsideChild;
    }

    /** 创建内转盘角度分割区域的 child */
    private async createInnerChild(selection: IEditor.IMyNode, luckWheel: IEditor.IMyComponent): Promise<IEditor.IMyNode> {
        let innerChild = await this.createChild(selection, luckWheel.props.innerSplitAngles, luckWheel.props.gizmoInnerRadius, "InnerChild", LuckWheelGizmoConfig.innerLineColor, LuckWheelGizmoConfig.innerFillColor);

        // 分割的区块索引数字
        let radius = luckWheel.props.gizmoInnerRadius * 0.8; // 数字显示在圆内，半径不取全长
        let splitPositions: number[] = this.getSplitPositions(luckWheel.props.innerSplitAngles, radius);
        this.createNumberTexts(innerChild, splitPositions, radius, LuckWheelGizmoConfig.innerLineColor);
        return innerChild;
    }

    /** 创建一个角度分割区域的 child */
    private async createChild(selection: IEditor.IMyNode, splitAngles: number[], radius: number, childName: string, lineColor: string, fillColor: string): Promise<IEditor.IMyNode> {
        let node = await Editor.scene.createNode("Sprite");
        
        // 多边形 graphics 绘图命令
        let cmd = {
            fillColor: fillColor,
            lineColor: lineColor,
            lineWidth: LuckWheelGizmoConfig.lineWidth,
            points: [0, 0],
            x: radius,
            y: radius,
            _$type: "DrawPolyCmd"
        }
        this.getSplitPolygonPoints(splitAngles, radius, cmd.points); // 设置多边形顶点
        node.props._gcmds = [cmd];

        node.props.name = childName;
        node.props.width = radius * 2;
        node.props.height = radius * 2;
        node.props.anchorX = 0.5;
        node.props.anchorY = 0.5;
        node.props.x = selection.props.pivotX;
        node.props.y = selection.props.pivotY;

        selection.addChild(node);
        return node;
    }

    /** 创建分割的区块索引数字 */
    private async createNumberTexts(parent: IEditor.IMyNode, splitPositions: number[], radius: number, textColor: string): Promise<any> {
        for (let i = 0, len = splitPositions.length; i < len; i += 2) {
            let x = splitPositions[i] + parent.props.width * parent.props.anchorX;
            let y = splitPositions[i + 1] + parent.props.height * parent.props.anchorY;
            let i2 = Math.trunc((i + 1) / 2);

            let textNode = await Editor.scene.createNode("Text");
            textNode.props.align = "center";
            textNode.props.fontSize = 20 * radius * 0.015; // 字体大小与圆大小成正比
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
            let comp = node.components[key];
            let scriptPath: string = comp.props.scriptPath;
            if (!scriptPath) continue;
            let foundId = scriptPath.lastIndexOf(`${type}.ts`);
            if (foundId < 0) continue;
            return comp;
        }
        return null;
    }

    /** 获取要绘制的分割线列表的多边形顶点 */
    private getSplitPolygonPoints(splitAngles: number[], radius: number, out?: number[]): number[] {
        let points: number[] = out ? out : [];
        points.length = 0; // 清空

        let angleIndex = 0; // 分割线角度数组的索引

        for (let i = 0; i < 360; i++) {
            let rad = i * Math.PI / 180;
            let x = Math.cos(rad) * radius;
            let y = Math.sin(rad) * radius;
            points.push(x, y);

            // 距离分割线角<=1度，则添加分割线点
            if (angleIndex < splitAngles.length && splitAngles[angleIndex] - i <= 1) {
                rad = splitAngles[angleIndex] * Math.PI / 180;
                x = Math.cos(rad) * radius;
                y = Math.sin(rad) * radius;
                points.push(x, y);
                points.push(0, 0);
                points.push(x, y);
                angleIndex++;
            }
        }
        return points;
    }

    /** 获取各个分割的区块对称轴线上的位置 */
    private getSplitPositions(splitAngles: number[], radius: number, out?: number[]): number[] {
        let results: number[] = out ? out : [];
        results.length = 0;
        if (!splitAngles || splitAngles.length === 0) return results;

        for (let i = 0, len = splitAngles.length; i < len; i++) {
            let nextI = (i + 1) % len;
            let min = splitAngles[i];
            let max = i >= len - 1 ? (360 + splitAngles[0]) : splitAngles[nextI];
            let rad = (min + (max - min) * 0.5) * Math.PI / 180;
            let x = Math.cos(rad) * radius;
            let y = Math.sin(rad) * radius;
            results.push(x, y);
        }
        return results;
    }

}