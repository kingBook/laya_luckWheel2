import LuckWheelUtil from "./LuckWheelUtil";
import { SplitData } from "./SplitData";

const { regClass, property } = Laya;

/** 转盘的模式 */
export enum LuckWheelMode {
    /** 单转盘，旋转指针 */
    SingleRotatePointer = 1,
    /** 单转盘，固定指针 */
    SingleFixedPointer = 2,
    /** 双转盘，固定指针 */
    DoubleFixedPointer = 4
}

enum Flag {
    /** 旋转中... */
    Rotating = 1,
    /** 暂停中... */
    Pausing = 2
}

/**
 * 幸运转盘
 * 
 * 旋转完成时，{@link owner} 将派发 {@link EVENT_ROTATION_COMPLETE} 事件
 * 
 * 接口说明：
 * ```
 * let luckWheel: LuckWheel = this.owner.getComponent(LuckWheel); 
 * 
 * // 设置转盘模式
 * luckWheel.mode = LuckWheelMode.SingleRotatePointer;
 * 
 * // 设置指针
 * luckWheel.pointer = xxx;
 * luckWheel.pointerAngleOffset = 90; // 指针素材的角度修正值
 * luckWheel.initPointerRpm = 14; // 固定指针的模式，可以不设置
 * 
 * // 角度分割数据
 * const splitData = new SplitData();
 * splitData.itemsContainer = xxx; // 必须是转盘(outsideDisc/innerDisc)的子级
 * splitData.splitAngles = [0, 90, 182, 270]; // 切分区块的分割线角度值，[0-359] 小 -> 大
 * 
 * // 设置外转盘
 * luckWheel.outsideDisc = xxx;
 * luckWheel.initOutsideDiscRpm = 0; // 只旋转指针的模式，可以不设置
 * luckWheel.outsideSplitDatas = [splitData,...];
 * 
 * // 设置内转盘（单转盘的模式，可以不设置）
 * luckWheel.innerDisc = xxx;
 * luckWheel.initInnerDiscRpm = 0; // 只旋转指针的模式，可以不设置
 * luckWheel.innerSplitDatas = [splitData,...]; // 切分区块的分割线角度值，[0-359] 小 -> 大
 * 
 * // ================ 其他接口 ======================================
 * // 开始旋转
 * luckWheel.startRotation();
 * // 设置奖励的索引（需开始旋转一会，再调用）
 * luckWheel.setRewardIndex(outsideRewardIndex, innerRewardIndex);
 * // 暂停旋转
 * luckWheel.setPause(true);
 * // 停止旋转
 * luckWheel.stopRotation();
 * // 侦听旋转完成
 * luckWheel.owner.on(LuckWheel.EVENT_ROTATION_COMPLETE, this, ()=>{
 *     // 旋转完成
 * });
 * 
 * // 获取外转盘各个分割的区块对称轴线上的位置（多用于动态摆放奖品图标时的位置）
 * luckWheel.getOutsideSplitPositions(radius, isAddCenter, out);
 * // 获取外转盘各个分割的区块对称轴线上的位置（多用于动态摆放奖品图标时的位置）
 * luckWheel.getInnerSplitPositions(radius, isAddCenter, out);
 * // 根据角度获取外转盘分割后的扇形区域索引
 * luckWheel.getOutsideIndexByAngle(ousideAngle);
 * // 根据角度获取内转盘分割后的扇形区域索引
 * luckWheel.getInnerIndexByAngle(innerAngle);
 * ```
 */
@regClass()
export class LuckWheel extends Laya.Script {

    /** 旋转完成事件 */
    public static readonly EVENT_ROTATION_COMPLETE: string = "eventRotationComplete";

    declare owner: Laya.Sprite;

    @property({ type: LuckWheelMode, private: true }) //  private：true，不会出现在IDE的属性面板上，只是用来存储输入
    private _mode: LuckWheelMode = LuckWheelMode.SingleRotatePointer;
    /** 转盘的模式 */
    @property({ type: LuckWheelMode, serializable: false, tips: "转盘的模式" }) // serializable：false，不会被保存到场景文件中
    public get mode(): LuckWheelMode { return this._mode; }



    // ===================== Editor start =========================
    @property({ type: Boolean, private: false, catalog: "Gizmo", tips: "是否在场景视图中显示 Gizmo 绘制的圆, 直观地查看角度分割线, 注意：仅显示 outsideSelectIndex 和 innerSelectIndex 指定的圆" })
    private _gizmoVisible: boolean = false;
    @property({ type: Number, private: false, catalog: "Gizmo", step: 1, fractionDigits: 0, tips: "Gizmo 绘制的外圆半径" })
    private _gizmoOutsideRadius: number = 350;
    @property({ type: Number, private: false, catalog: "Gizmo", step: 1, fractionDigits: 0, readonly: "data.mode==1||data.mode==2", tips: "Gizmo 绘制的内圆半径" })
    private _gizmoInnerRadius: number = 200;
    // =====================  Editor end  =========================


    // ===================== Pointer start  =======================
    /** 圆盘的指针 */
    @property({ type: Laya.Sprite, catalog: "Pointer", tips: "圆盘的指针" })
    public pointer: Laya.Sprite;
    /** 指针素材的角度修正 */
    @property({ type: Number, catalog: "Pointer", step: 0.1, fractionDigits: 1, range: [-180, 180], tips: "指针素材的角度修正" })
    public pointerAngleOffset: number = 90;
    /** 初始的指针转速<度>，可以是负数 */
    @property({ type: Number, catalog: "Pointer", readonly: "data.mode!=1", step: 0.1, fractionDigits: 1, range: [-45, 45], tips: "初始的指针转速<度>，可以是负数" })
    public initPointerRpm: number = 9;
    // =====================  Pointer end  ========================


    // ===================== Outside start  =======================
    /** 外转盘 */
    @property({ type: Laya.Sprite, catalog: "Outside", tips: "外转盘" })
    public outsideDisc: Laya.Sprite;
    /** 初始的外转盘的转速<度>，可以是负数 */
    @property({ type: Number, catalog: "Outside", step: 0.1, fractionDigits: 1, range: [-45, 45], tips: "初始的外转盘的转速<度>，可以是负数" })
    public initOutsideDiscRpm: number = 9;

    @property({ type: Number, private: true }) //  private：true，不会出现在IDE的属性面板上，只是用来存储输入
    private _outsideSelectIndex: number = 0;
    /** 外转盘选择的分割数据索引 */
    @property({ type: Number, catalog: "Outside", serializable: false, enumSource: "outsideSelectIndexEnumSource", min: 0, step: 1, fractionDigits: 0, tips: "外转盘选择的分割数据索引" }) // serializable：false，不会被保存到场景文件中
    public get outsideSelectIndex(): number { return this._outsideSelectIndex; }
    /** outsideSelectIndex 枚举源 ，仅用于编辑器 */
    @property({ type: [["Record", String]], hidden: true, serializable: false })
    public get outsideSelectIndexEnumSource() {
        const result: { name: string, value: number }[] = [];
        this.outsideSplitDatas.forEach((item, index) => {
            result[index] = { name: index.toString(), value: index };
        }, this);
        return result;
    }

    /** 外转盘的分割数据数组 */
    @property({ type: [SplitData], catalog: "Outside", nullable: false, minArrayLength: 1, tips: "外转盘的分割数据数组" })
    public outsideSplitDatas: SplitData[] = [];
    // =====================  Outside end   =======================


    // ===================== Inner start  =========================
    /** 内转盘 */
    @property({ type: Laya.Sprite, catalog: "Inner", readonly: "data.mode==1||data.mode==2", tips: "内转盘" })
    public innerDisc: Laya.Sprite;
    /** 初始的内转盘的转速<度>，可以是负数 */
    @property({ type: Number, catalog: "Inner", readonly: "data.mode==1||data.mode==2", step: 0.1, fractionDigits: 1, range: [-45, 45], tips: "初始的内转盘的转速<度>，可以是负数" })
    public initInnerDiscRpm: number = 9;

    @property({ type: Number, private: true }) //  private：true，不会出现在IDE的属性面板上，只是用来存储输入
    private _innerSelectIndex: number = 0;
    /** 内转盘选择的分割数据索引 */
    @property({ type: Number, catalog: "Inner", serializable: false, enumSource: "innerSelectIndexEnumSource", min: 0, step: 1, fractionDigits: 0, readonly: "data.mode==1||data.mode==2", tips: "内转盘选择的分割数据索引" }) // serializable：false，不会被保存到场景文件中
    public get innerSelectIndex(): number { return this._innerSelectIndex; }
    /** innerSelectIndex 枚举源，仅用于编辑器 */
    @property({ type: [["Record", String]], hidden: true, serializable: false })
    public get innerSelectIndexEnumSource() {
        const result: { name: string, value: number }[] = [];
        this.innerSplitDatas.forEach((item, index) => {
            result[index] = { name: index.toString(), value: index };
        }, this);
        return result;
    }

    /** 内转盘的分割数据数组 */
    @property({ type: [SplitData], catalog: "Inner", nullable: false, readonly: "data.mode==1||data.mode==2", minArrayLength: 1, tips: "内转盘的分割数据数组" })
    public innerSplitDatas: SplitData[] = [];
    // =====================  Inner end   =========================


    /** 旋转的中心 */
    private _center: Laya.Point;
    /** 指针半径 */
    private _pointerRadius: number;
    /** 指针的角度, [0,360] */
    private _pointerAngle: number;
    /** 外转盘奖励结果索引 */
    private _outsideRewardIndex: number;
    /** 内转盘奖励结果索引 */
    private _innerRewardIndex: number;
    private _flags: number;

    private _pointerRotationalObj: RotationalObject;
    private _outsideRotationalObj: RotationalObject;
    private _innerRotationalObj: RotationalObject;

    /** 指针半径 */
    public get pointerRadius(): number { return this._pointerRadius; }
    /** 指针的角度, [0,360] */
    public get pointerAngle(): number { return this._pointerAngle; }
    /** 是否暂停中... */
    public get isPausing(): boolean { return (this._flags & Flag.Pausing) > 0; }
    /** 是否正在旋转中... */
    public get isRotating(): boolean { return (this._flags & Flag.Rotating) > 0; }
    /** 外转盘奖励结果索引 */
    public get outsideRewardIndex(): number { return this._outsideRewardIndex; }
    /** 内转盘奖励结果索引 */
    public get innerRewardIndex(): number { return this._innerRewardIndex; }
    /** 指针旋转对象 */
    public get pointerRotationalObject(): RotationalObject { return this._pointerRotationalObj; }
    /** 外转盘旋转对象 */
    public get outsideRotationalObject(): RotationalObject { return this._outsideRotationalObj; }
    /** 内转盘旋转对象 */
    public get innerRotationalObject(): RotationalObject { return this._innerRotationalObj; }
    /** 当前选择的外转盘索引指定的分割数据 */
    public get currentOutsideSplitData() { return this.outsideSplitDatas[this._outsideSelectIndex]; }
    /** 当前选择的内转盘索引指定的分割数据 */
    public get currentInnerSplitData() { return this.innerSplitDatas[this._innerSelectIndex]; }

    /** 设置转盘的模式 */
    public set mode(value: LuckWheelMode) {
        this._mode = value;
        // 双转盘时，
        switch (this._mode) {
            case LuckWheelMode.SingleFixedPointer:
            case LuckWheelMode.SingleRotatePointer:
                if (this.outsideDisc) this.outsideDisc.active = this.outsideDisc.visible = true;
                // 单转盘时，隐藏内转盘
                if (this.innerDisc) this.innerDisc.active = this.innerDisc.visible = false;
                break;
            case LuckWheelMode.DoubleFixedPointer:
                if (this.outsideDisc) this.outsideDisc.active = this.outsideDisc.visible = true;
                if (this.innerDisc) this.innerDisc.active = this.innerDisc.visible = true;
                break;
        }
    }

    /** 设置外转盘选择的数据索引，不能超出数组 {@link outsideSplitDatas} 的索引范围 */
    public set outsideSelectIndex(value: number) {
        value = Laya.MathUtil.clamp(value, 0, this.outsideSplitDatas.length - 1); // 选择的索引不能超过分割数据数组的范围
        this._outsideSelectIndex = value;
        this.outsideSplitDatas.forEach((data, index) => {
            if (data.itemsContainer) {
                // 在盘面中显示选中索引指定的容器，其他容器隐藏
                data.itemsContainer.active = data.itemsContainer.visible = (value === index);
            }
        });
    }

    /** 设置内转盘选择的数据索引，不能超出数组 {@link innerSplitDatas} 的索引范围 */
    public set innerSelectIndex(value: number) {
        value = Laya.MathUtil.clamp(value, 0, this.innerSplitDatas.length - 1); // 选择的索引不能超过分割数据数组的范围
        this._innerSelectIndex = value;
        this.innerSplitDatas.forEach((data, index) => {
            if (data.itemsContainer) {
                // 在盘面中显示选中索引指定的容器，其他容器隐藏
                data.itemsContainer.active = data.itemsContainer.visible = (value === index);
            }
        });
    }


    public onAwake(): void {
        // 指针、外转盘、内转盘为空时，赋值一个 sprite 避免报错
        this.pointer ||= new Laya.Sprite();
        this.outsideDisc ||= new Laya.Sprite();
        this.innerDisc ||= new Laya.Sprite();

        // 中心坐标
        this._center = new Laya.Point(this.owner.pivotX, this.owner.pivotY);
        // 计算指针半径
        this._pointerRadius = this._center.distance(this.pointer.x, this.pointer.y);
        // 指针角度
        this.setPointerAngle(Laya.Utils.toAngle(Math.atan2(this.pointer.y - this._center.y, this.pointer.x - this._center.x)));

        // 创建旋转的对象
        this._pointerRotationalObj = new RotationalObject();
        this._outsideRotationalObj = new RotationalObject();
        this._innerRotationalObj = new RotationalObject();
        this._pointerRotationalObj.on(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);
        this._outsideRotationalObj.on(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);
        this._innerRotationalObj.on(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);

        // 调用 setter 方法, 初始显示或隐藏转盘
        this.mode = this._mode;
        // 调用 setter 方法，初始显示或隐藏物品容器
        this.outsideSelectIndex = this._outsideSelectIndex;
        this.innerSelectIndex = this._innerSelectIndex;

        // 侦听切换后台
        Laya.stage.on(Laya.Event.VISIBILITY_CHANGE, this, this.onStageVisibilityChange);
    }

    public onUpdate(): void {
        if ((this._flags & Flag.Rotating) === 0) return;
        if (this._flags & Flag.Pausing) return;

        switch (this.mode) {
            case LuckWheelMode.SingleRotatePointer:
                this._pointerRotationalObj.update();
                this.setPointerAngle(this._pointerRotationalObj.angle);
                break;
            case LuckWheelMode.SingleFixedPointer:
                this._outsideRotationalObj.update();
                this.outsideDisc.rotation = this._outsideRotationalObj.angle;
                break;
            case LuckWheelMode.DoubleFixedPointer:
                this._outsideRotationalObj.update();
                this.outsideDisc.rotation = this._outsideRotationalObj.angle;

                this._innerRotationalObj.update();
                this.innerDisc.rotation = this._innerRotationalObj.angle;
                break;
        }
    }

    /** 开始旋转 */
    public startRotation(): void {
        if (this._flags & Flag.Rotating) return;
        this._flags |= Flag.Rotating;

        this.setPause(false);

        this.setPointerAngle(Laya.Utils.toAngle(Math.atan2(this.pointer.y - this._center.y, this.pointer.x - this._center.x)));

        // 根据模式初始化
        switch (this.mode) {
            case LuckWheelMode.SingleRotatePointer:
                this._pointerRotationalObj.setRewardAngle(NaN);
                this._pointerRotationalObj.init(this._pointerAngle, this.initPointerRpm);
                break;
            case LuckWheelMode.SingleFixedPointer:
                this._outsideRotationalObj.setRewardAngle(NaN);
                this._outsideRotationalObj.init(this.outsideDisc.rotation, this.initOutsideDiscRpm);
                break;
            case LuckWheelMode.DoubleFixedPointer:
                this._outsideRotationalObj.setRewardAngle(NaN);
                this._outsideRotationalObj.init(this.outsideDisc.rotation, this.initOutsideDiscRpm);

                this._innerRotationalObj.setRewardAngle(NaN);
                this._innerRotationalObj.init(this.innerDisc.rotation, this.initInnerDiscRpm);
                break;
        }
    }

    /** 停止旋转 */
    public stopRotation(): void {
        this._flags &= ~Flag.Rotating;
    }

    /**
     * 设置奖励索引
     * @param outsideRewardIndex 外转盘的奖励索引(正整数)，值区间: [ 0, {@link outsideSplitAngles}.length )
     * @param innerRewardIndex 内转盘的奖励索引(正整数)，值区间: [ 0, {@link innerSplitAngles}.length )
     */
    public setRewardIndex(outsideRewardIndex: number, innerRewardIndex?: number): void {
        // 储存用索引计算得到的奖励角
        let outsideRewardAngle: number, innerRewardAngle: number;

        // 设置外奖励索引
        const outsideSplitData = this.currentOutsideSplitData;
        if (outsideRewardIndex < 0 || outsideRewardIndex >= outsideSplitData.splitAngles.length) {
            throw new Error(`外转盘奖励索引,必须为正整数且小于分割线的数量 ${outsideSplitData.splitAngles.length}, 当前值: ${outsideRewardIndex}`);
        }
        this._outsideRewardIndex = outsideRewardIndex;
        // 获取外奖励角
        outsideRewardAngle = this.getRewardAngleByIndex(this._outsideRewardIndex, outsideSplitData);

        // 设置内奖励索引
        let innerSplitData: SplitData = null;
        if (!isNaN(innerRewardIndex)) {
            innerSplitData = this.currentInnerSplitData;
            if (innerRewardIndex < 0 || innerRewardIndex >= innerSplitData.splitAngles.length) {
                throw new Error(`内转盘奖励索引,必须为正整数且小于分割线的数量 ${innerSplitData.splitAngles.length}, 当前值: ${innerRewardIndex}`);
            }
            this._innerRewardIndex = innerRewardIndex;
            // 获取内奖励角
            innerRewardAngle = this.getRewardAngleByIndex(this._innerRewardIndex, innerSplitData);
        }
        // 设置奖励角
        this.setRewardAngle(outsideRewardAngle, innerRewardAngle);
    }

    /**
     * 设置奖励角
     * @param outsideRewardAngle 外转盘的奖励角 [0, 360],（角度分割线的第一条线为0度, 顺时针）
     * @param innerRewardAngle 内转盘的奖励角 [0, 360],（角度分割线的第一条线为0度, 顺时针）
     */
    public setRewardAngle(outsideRewardAngle: number, innerRewardAngle?: number): void {
        // 加上偏移量
        outsideRewardAngle += this.currentOutsideSplitData.angleOffset + this.currentOutsideSplitData.splitAngles[0];
        // 转为 [0, 360]
        outsideRewardAngle = Laya.MathUtil.repeat(outsideRewardAngle, 360);
        // 根据奖励角获取外转盘奖励索引
        this._outsideRewardIndex = this.getOutsideIndexByAngle(outsideRewardAngle - this.currentOutsideSplitData.angleOffset);

        if (!isNaN(innerRewardAngle)) {
            // 加上偏移量
            innerRewardAngle += this.currentInnerSplitData.angleOffset + this.currentInnerSplitData.splitAngles[0];
            // 转为 [0, 360]
            innerRewardAngle = Laya.MathUtil.repeat(innerRewardAngle, 360);
            // 根据奖励角获取内转盘奖励索引
            this._innerRewardIndex = this.getInnerIndexByAngle(innerRewardAngle - this.currentInnerSplitData.angleOffset);
        }

        // 固定指针时，计算指针角度偏移
        if ((this.mode & LuckWheelMode.SingleFixedPointer) || (this.mode & LuckWheelMode.DoubleFixedPointer)) {
            outsideRewardAngle = 360 - outsideRewardAngle; // 与 splitAngles[0] 角度分割线对齐
            outsideRewardAngle = Laya.MathUtil.repeat(outsideRewardAngle + this._pointerAngle, 360); // 加上指针角度偏移

            if (!isNaN(innerRewardAngle)) {
                // 固定指针时，计算指针角度偏移
                innerRewardAngle = 360 - innerRewardAngle; // 与 splitAngles[0] 角度分割线对齐
                innerRewardAngle = Laya.MathUtil.repeat(innerRewardAngle + this._pointerAngle, 360); // 加上指针角度偏移
            }
        }

        switch (this.mode) {
            case LuckWheelMode.SingleRotatePointer:
                this._pointerRotationalObj.setRewardAngle(outsideRewardAngle);
                break;
            case LuckWheelMode.SingleFixedPointer:
                this._outsideRotationalObj.setRewardAngle(outsideRewardAngle);
                break;
            case LuckWheelMode.DoubleFixedPointer:
                this._outsideRotationalObj.setRewardAngle(outsideRewardAngle);
                if (!isNaN(innerRewardAngle)) {
                    this._innerRotationalObj.setRewardAngle(innerRewardAngle);
                } else {
                    throw new Error("innerRewardAngle 未设置, DoubleFixedPointer 模式时，必须设置内转盘的奖励角");
                }
                break;
        }
    }

    /** 设置暂停 */
    public setPause(isPause: boolean): void {
        if (isPause) {
            this._flags |= Flag.Pausing;
        } else {
            this._flags &= ~Flag.Pausing;
        }
    }

    /**
     * 获取外转盘分割线切分的各个扇形对称轴线的位置（多用于动态摆放奖品图标时的位置）
     * @param radius 半径
     * @param isAddCenter 计算时是否添加中心坐标
     * @param out 存储输出结果的数组，数组的长度为: {@link outsideSplitAngles}.length * 2
     * @returns 返回位置数组，结果以 [x,y,...] 格式存储，数组的长度为: {@link outsideSplitAngles}.length * 2, 当 {@link outsideSplitAngles} 未定义或长度为 0 时返回空数组
     */
    public getOutsideSplitPositions(radius: number, isAddCenter: boolean, out?: number[]): number[] {
        const angleOffset = this.currentOutsideSplitData.angleOffset;
        const splitAngles = this.currentOutsideSplitData.splitAngles;
        const centerOffsetPoint = isAddCenter ? this._center : null;
        return LuckWheelUtil.getSplitPositions(angleOffset, splitAngles, radius, centerOffsetPoint, out);
    }

    /**
     * 获取内转盘分割线切分的各个扇形对称轴线的位置（多用于动态摆放奖品图标时的位置）
     * @param radius 半径
     * @param isAddCenter 计算时是否添加中心坐标 
     * @param out 存储输出结果的数组，数组的长度为: {@link innerSplitAngles}.length * 2
     * @returns 返回位置数组，结果以 [x,y,...] 格式存储，数组的长度为: {@link innerSplitAngles}.length * 2, 当 {@link innerSplitAngles} 未定义或长度为 0 时返回空数组
     */
    public getInnerSplitPositions(radius: number, isAddCenter: boolean, out?: number[]): number[] {
        const angleOffset = this.currentInnerSplitData.angleOffset;
        const splitAngles = this.currentInnerSplitData.splitAngles;
        const centerOffsetPoint = isAddCenter ? this._center : null;
        return LuckWheelUtil.getSplitPositions(angleOffset, splitAngles, radius, centerOffsetPoint, out);
    }

    /**
     * 根据角度获取外转盘分割后的扇形区域索引（根据角度分割线取，计算时包含起始角度线，不包含末尾角度线）
     * 
     * 注意：如果参数使用的是指针角度 {@link pointerAngle} 需要加上对应盘面的角度偏移量，例：
     * ```
     * const fanIndex = this.luckWheel.getOutsideIndexByAngle(this.luckWheel.pointerAngle - this.luckWheel.currentOutsideSplitData.angleOffset);
     * // 如果是固定指针模式，则需要减去盘面自身的旋转角度，如：
     * const fanIndex2 = this.luckWheel.getOutsideIndexByAngle(this.luckWheel.pointerAngle - this.luckWheel.currentOutsideSplitData.angleOffset - this.luckWheel.outsideDisc.rotation);
     * ```
     * @param outsideAngle 外转盘中的角度 [0, 360]
     */
    public getOutsideIndexByAngle(outsideAngle: number): number {
        return this.getIndexByAngle(outsideAngle, this.currentOutsideSplitData.splitAngles);
    }

    /**
     * 根据角度获取内转盘分割后的扇形区域索引（根据角度分割线取，计算时包含起始角度线，不包含末尾角度线）
     * 
     * 注意：如果参数使用的是指针角度 {@link pointerAngle} 需要加上对应盘面的角度偏移量，例：
     * ```
     * const fanIndex = this.luckWheel.getInnerIndexByAngle(this.luckWheel.pointerAngle - this.luckWheel.currentInnerSplitData.angleOffset);
     * ```
     * @param innerAngle 内转盘中的角度 [0, 360]
     */
    public getInnerIndexByAngle(innerAngle: number): number {
        return this.getIndexByAngle(innerAngle, this.currentInnerSplitData.splitAngles);
    }

    /**
     * 根据角度获取分割后的扇形区域索引（根据角度分割线取，计算时包含起始角度线，不包含末尾角度线）
     * @param angle 用来获取索引的的角度, 将直接使用此值与分割线的角度列表的值直接比较，不在 [0, 360] 内时，将被自动转换为: [0, 360]
     * @param splitAngles 转盘分割线的角度列表, 元素的值区间为: [0, 359]
     * @returns 返回索引，区间为: [0, {@link splitAngles}.length]
     */
    private getIndexByAngle(angle: number, splitAngles: number[]): number {
        // 取 [0, 360]
        angle = Laya.MathUtil.repeat(angle, 360);

        // 由于判断的是包含下限角，小于下限角，当前角和上限角都为360时就会出错，所以转为0度
        // 例 ：如果当前角度为 360, 下限角为350, 上限角为360，则当前角不在上下限范围内，便出错了
        if (angle === 360) {
            angle = 0;
        }

        let result = -1;

        for (let i = 0, len = splitAngles.length; i < len; i++) {
            // 当前角
            const curAngle = splitAngles[i];
            // 下一个角
            let nextAngle = splitAngles[i + 1];
            if (i >= len - 1) {
                // 到达末尾索引时，取（360+起始角）
                nextAngle = (360 + splitAngles[0]);
                // 奖励角小于当前角时，也要+360才能正确计算
                if (angle < curAngle) angle += 360;
            }
            // 区间处于 [curAngle, nextAngle) 则找到了索引
            if (angle >= curAngle && angle < nextAngle) {
                result = i;
                break;
            }
        }

        if (result === -1) {
            throw new Error(`根据角度未能找到索引, 角度为：${angle}`);
        }
        return result;
    }

    /** 旋转完成时 */
    private onRotateComplete(rotationalObj: RotationalObject): void {
        switch (this.mode) {
            case LuckWheelMode.SingleRotatePointer:
            case LuckWheelMode.SingleFixedPointer:
                this._flags &= ~Flag.Rotating;
                this.owner.event(LuckWheel.EVENT_ROTATION_COMPLETE);
                break;
            case LuckWheelMode.DoubleFixedPointer:
                if (this._outsideRotationalObj.isRotationComplete && this._innerRotationalObj.isRotationComplete) {
                    this._flags &= ~Flag.Rotating;
                    this.owner.event(LuckWheel.EVENT_ROTATION_COMPLETE);
                }
                break;
        }
    }

    /**
     * 根据奖励索引返回奖励的角度
     * @param rewardIndex 转盘奖励索引
     * @param splitData 转盘分割数据
     * @returns 返回角度 [0, 360],（角度分割线的第一条线为0度, 顺时针）
     */
    private getRewardAngleByIndex(rewardIndex: number, splitData: SplitData): number {
        const splitAngles = splitData.splitAngles;
        // 区块的下限角
        const min = splitAngles[rewardIndex];
        // 区块的上限角，到达分割线数组最大索引时取 (360+splitAngles[0])
        const max = rewardIndex >= splitAngles.length - 1 ? (360 + splitAngles[0]) : splitAngles[rewardIndex + 1];

        const t = 0.5; // 取扇形中间
        let rewardAngle = Laya.MathUtil.lerp(min, max, t); // splitAngles[0]>0 时，此值可能大于 360

        // 角度分割线的第一条线为0度，所以此处减去第一条线的角度，并转为 [0, 360]
        rewardAngle = Laya.MathUtil.repeat(rewardAngle - splitAngles[0], 360);
        return rewardAngle;
    }

    /**
     * 设置指针的角度
     * @param value 角度值
     */
    public setPointerAngle(value: number): void {
        this._pointerAngle = Laya.MathUtil.repeat(value, 360);
        // 旋转指针
        let pointerRadian = Laya.Utils.toRadian(this._pointerAngle);
        this.pointer.pos(
            this._center.x + Math.cos(pointerRadian) * this._pointerRadius,
            this._center.y + Math.sin(pointerRadian) * this._pointerRadius
        );

        this.pointer.rotation = this._pointerAngle + this.pointerAngleOffset;
    }

    /**
     * 设置旋转对象角度，并同步内外转盘或指针的角度
     * @param outsideRotation 外转盘旋转对象的角度值（{@link outsideDisc}.rotation），如果是单转盘旋转指针模式则表示指针旋转对象的角度值 ({@link pointer}.rotation - {@link pointerAngleOffset})
     * @param innerRotation 内转盘旋转对象的角度值（{@link innerDisc}.rotation）
     */
    public setRotationalObjectAngle(outsideRotation: number, innerRotation: number = NaN): void {
        switch (this.mode) {
            case LuckWheelMode.SingleRotatePointer:
                this._pointerRotationalObj.setAngle(outsideRotation);
                this.setPointerAngle(this._pointerRotationalObj.angle);
                break;
            case LuckWheelMode.SingleFixedPointer:
                this._outsideRotationalObj.setAngle(outsideRotation);
                this.outsideDisc.rotation = this._outsideRotationalObj.angle;
                break;
            case LuckWheelMode.DoubleFixedPointer:
                this._outsideRotationalObj.setAngle(outsideRotation);
                this.outsideDisc.rotation = this._outsideRotationalObj.angle;
                if (!isNaN(innerRotation)) {
                    this._innerRotationalObj.setAngle(innerRotation);
                    this.innerDisc.rotation = this._innerRotationalObj.angle;
                }
                break;
        }
    }

    /**
     * 设置旋转对象角度到指定的索引，并同步内外转盘或指针的角度
     * @param outsideIndex 外转盘索引(正整数)，值区间: [ 0, {@link outsideSplitAngles}.length )
     * @param innerIndex 内转盘索引(正整数)，值区间: [ 0, {@link innerSplitAngles}.length )
     */
    public setRotationalObjectAngleToIndex(outsideIndex: number, innerIndex: number = NaN): void {
        let outsideRotation: number = NaN;
        let innerRotation: number = NaN;

        outsideRotation = this.getRewardAngleByIndex(outsideIndex, this.currentOutsideSplitData);
        // 加上偏移量
        outsideRotation += this.currentOutsideSplitData.angleOffset + this.currentOutsideSplitData.splitAngles[0];
        // 转为 [0, 360]
        outsideRotation = Laya.MathUtil.repeat(outsideRotation, 360);

        if (!isNaN(innerIndex)) {
            innerRotation = this.getRewardAngleByIndex(innerIndex, this.currentInnerSplitData);
            // 加上偏移量
            innerRotation += this.currentInnerSplitData.angleOffset + this.currentInnerSplitData.splitAngles[0];
            // 转为 [0, 360]
            innerRotation = Laya.MathUtil.repeat(innerRotation, 360);
        }

        // 固定指针时，计算指针角度偏移
        if ((this.mode & LuckWheelMode.SingleFixedPointer) || (this.mode & LuckWheelMode.DoubleFixedPointer)) {
            outsideRotation = 360 - outsideRotation; // 与 splitAngles[0] 角度分割线对齐
            outsideRotation = Laya.MathUtil.repeat(outsideRotation + this._pointerAngle, 360); // 加上指针角度偏移
            if (!isNaN(innerRotation)) {
                // 固定指针时，计算指针角度偏移
                innerRotation = 360 - innerRotation; // 与 splitAngles[0] 角度分割线对齐
                innerRotation = Laya.MathUtil.repeat(innerRotation + this._pointerAngle, 360); // 加上指针角度偏移
            }
        }

        this.setRotationalObjectAngle(outsideRotation, innerRotation);
    }

    /** 舞台可见性发生变化时调度（比如浏览器或者当前标签被切换到后台后调度） */
    private onStageVisibilityChange(): void {
        if (!Laya.stage.isVisibility) {
            // 切换到在后台时

        } else {
            // 从后台切回来时
        }
    }

    public onDestroy(): void {
        this._pointerRotationalObj.off(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);
        this._outsideRotationalObj.off(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);
        this._innerRotationalObj.off(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);
        Laya.stage.off(Laya.Event.VISIBILITY_CHANGE, this, this.onStageVisibilityChange);
        this._pointerRotationalObj = null;
        this._outsideRotationalObj = null;
        this._innerRotationalObj = null;
        this.pointer?.destroy();
        this.outsideDisc?.destroy();
        this.innerDisc?.destroy();
    }

}

/**
 * 旋转的对象
 * 
 * 旋转完成时，this 派发 {@link EVENT_ROTATION_COMPLETE} 事件
 */
export class RotationalObject extends Laya.EventDispatcher {

    /** 旋转完成事件 */
    public static readonly EVENT_ROTATION_COMPLETE: string = "eventRotationComplete";

    /** 当前所在的角 [0,360] */
    private _angle: number;
    /** 转速<度> */
    private _rpm: number;
    /** 旋转启动后，慢慢加速到达的目标转速<度> */
    private _rpmTarget: number;
    /** 到达目标转速的插值，区间为：[0,1]*/
    private _rpmT: number;
    /** 奖励角度 [0,360] */
    private _rewardAngle: number;
    /** 是否处于缓中... */
    private _isEasing: boolean;
    /** 是否旋转完成 */
    private _isRotationComplete: boolean;
    /** 是否开始降速 */
    private _isStartSlowing: boolean;
    /** 开始缓动时的转速阈值<正数> */
    private _easeThreshold: number;

    /** 缓动的角长（当降速到达缓动阈值时，需大于此值才开始缓动，此值还用于计算缓动的进度插值） */
    public easeAngleLen: number = 260;
    /** 开始缓动角速度的阈值 t <正数>，区间为：[0, 1]（阈值 = {@link _rpmTarget} 的绝对值 * t） */
    public easeThresholdT: number = 0.5;
    /** 旋转启动时的加速插值 */
    public startupAccelerationT: number = 0.025;
    /** 最小转速<正数> */
    public minRpm: number = 0.1;
    /** 得到奖励角时降速旋转摩擦系数 */
    public rotateFriction: number = 0.985;
    /** 是否显示 log */
    public isShowLogMsg: boolean = false;

    /** 当前所在的角 [0,360] */
    public get angle(): number { return this._angle; }
    /** 转速<度> */
    public get rmp(): number { return this._rpm; }
    /** 到达目标转速的插值，区间为：[0, 1] */
    public get rpmT(): number { return this._rpmT; }
    /** 旋转启动后，慢慢加速到达的目标转速<度> */
    public get rmpTarget(): number { return this._rpmTarget; }
    /** 奖励角度[0,360]  */
    public get rewardAngle(): number { return this._rewardAngle; }
    /** 是否处于缓中... */
    public get isEasing(): boolean { return this._isEasing; }
    /** 是否旋转结束 */
    public get isRotationComplete(): boolean { return this._isRotationComplete; }


    /**
     * 初始化
     * @param angle 当前所在的角 [0,360]
     * @param rpmTarget 旋转启动后，慢慢加速到达的目标速度 
     */
    public init(angle: number, rpmTarget: number): void {
        this.setAngle(angle);
        this._rpmTarget = rpmTarget;
        this._rpmT = 0;
        this._rpm = 0;

        this._easeThreshold = Math.abs(rpmTarget) * this.easeThresholdT;

        this.setRewardAngle(NaN);
        this._isStartSlowing = false;
        this._isEasing = false;
        this._isRotationComplete = false;
    }

    public update(): void {
        if (this._isRotationComplete) return;

        // 未得到奖励角，慢慢加速至目标速度后，以目标速度匀速旋转
        if (isNaN(this._rewardAngle)) {
            this._rpmT = Math.min(this._rpmT + this.startupAccelerationT, 1);
            this._rpm = Laya.MathUtil.lerp(Math.sign(this._rpmTarget) * this.minRpm, this._rpmTarget, this._rpmT);
            this.isShowLogMsg && console.log("未得到奖励角 rpm:", this._rpm);
            this.setAngle(this._angle + this._rpm);
            return;
        }

        // 计算与奖励角还有多少距离
        const targetAngle = Math.sign(this._rpm) >= 0
            ? this._rewardAngle
            : (360 - this._rewardAngle);
        const currentAngle = Math.sign(this._rpm) >= 0
            ? this._angle
            : 360 - this._angle;
        const deltaAngle = Laya.MathUtil.repeat(targetAngle - currentAngle, 360); // 距离奖励角的度数，根据旋转的方向计算，此值始终为正数

        // 缓动到奖励角中...
        if (this._isEasing) {
            let t = 1 - Laya.MathUtil.clamp01(deltaAngle / this.easeAngleLen); // 缓动的进度插值
            t = t >= 0.999 ? 1 : t;

            // 缓动是否已完成
            let isEasingFinish = false;

            if (t >= 1) { // 当缓动的进度满时，由于小数计算的精度问题，当前角度并不一定就到达目标奖励角
                if (deltaAngle > this.minRpm) { // 给一个最小转速，当与目标奖励角还有距离时，继续以最小转速旋转
                    this._rpm = Math.sign(this._rpm) * this.minRpm;
                    this.setAngle(this._angle + this._rpm);
                    this.isShowLogMsg && console.log("t>=1, 但与奖励还有很距离，继续以最小转速旋转");
                } else { // 到达目标奖励角，结束旋转
                    isEasingFinish = true;
                    this.isShowLogMsg && console.log(`到达目标奖励角:${this._rewardAngle}，结束旋转`);
                }
            } else {
                // 缓动旋转
                const rotationSpeed = Math.ceil(Laya.MathUtil.lerp(this._easeThreshold, this.minRpm, t) * 10) / 10; // 限制最小转速，速度保留一个小数
                this._rpm = Math.sign(this._rpm) * rotationSpeed;

                if (deltaAngle > Math.abs(this._rpm)) {
                    this.setAngle(this._angle + this._rpm);
                    this.isShowLogMsg && console.log(`缓动中 t<1 t:${t}, rpm:${this._rpm}`);
                } else {
                    isEasingFinish = true;
                    this.isShowLogMsg && console.log(`缓动中当前速度超过奖励角，结束旋转`);
                }
            }

            if (isEasingFinish) {
                this._isStartSlowing = false;
                this._isEasing = false; // 结束缓动
                this._rpm = 0;
                this.setAngle(this._rewardAngle); // 设置角度值等于奖励角避免误差
                this._isRotationComplete = true;
                // 旋转完成
                this.event(RotationalObject.EVENT_ROTATION_COMPLETE, this);
            }
            return;
        }

        // 降速旋转
        if (this._isStartSlowing) {
            // 当速度小于缓动的阈值时，开始缓动到奖励角
            if (Math.abs(this._rpm) <= Math.abs(this._rpmTarget) * this.easeThresholdT) {
                this._rpm *= this.rotateFriction;
                if (Math.abs(deltaAngle) >= this.easeAngleLen) { // 距离太小，继续旋转，到达大角度才缓动
                    // 开始缓动
                    this._isEasing = true;
                    this._easeThreshold = Math.abs(this._rpm);
                    this.isShowLogMsg && console.log("开始缓动 rpm:", this._rpm);
                } else {
                    this.isShowLogMsg && console.log("距离太小，继续旋转 rpm:", this._rpm);
                }
                this.setAngle(this._angle + this._rpm);
            } else {
                this._rpm *= this.rotateFriction;
                this.setAngle(this._angle + this._rpm);
                this.isShowLogMsg && console.log("降速旋转 rpm:", this._rpm);
            }
            return;
        }

        // 匀速旋转，当距离奖励角够远时，开始降速
        this.setAngle(this._angle + this._rpm);
        if (Math.abs(deltaAngle) >= this.easeAngleLen) {
            this._isStartSlowing = true;
        }

    }

    /**
     * 设置奖励结果的角度（将停止在指定的角度）
     * @param value 角度值 [0, 360], NaN：表示不设置
     */
    public setRewardAngle(value: number): void {
        this._rewardAngle = Laya.MathUtil.repeat(value, 360);
    }

    /** 设置角度值 */
    public setAngle(value: number): void {
        this._angle = Laya.MathUtil.repeat(value, 360);
    }


}