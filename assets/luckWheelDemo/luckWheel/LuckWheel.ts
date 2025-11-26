import Utils from "utils/Utils";
import { BezierEaseData } from "./BezierEaseData";
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
 * luckWheel.isInitPointerClockwise = true; // 固定指针的模式，可以不设置
 * 
 * // 角度分割数据
 * const splitData = new SplitData();
 * splitData.itemsContainer = xxx; // 必须是转盘(outsideDisc/innerDisc)的子级
 * splitData.splitAngles = [0, 90, 182, 270]; // 切分区块的分割线角度值，[0-359] 小 -> 大
 * 
 * // 设置外转盘
 * luckWheel.outsideDisc = xxx;
 * luckWheel.isInitOutsideClockwise = true; // 只旋转指针的模式，可以不设置
 * luckWheel.outsideSplitDatas = [splitData,...];
 * 
 * // 设置内转盘（单转盘的模式，可以不设置）
 * luckWheel.innerDisc = xxx;
 * luckWheel.isInitInnerClockwise = false; // 只旋转指针的模式，可以不设置
 * luckWheel.innerSplitDatas = [splitData,...]; // 切分区块的分割线角度值，[0-359] 小 -> 大
 * 
 * // ================ 其他接口 ======================================
 * // 设置奖励的索引
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
    /** 初始指针的旋转方向，是否为顺时针 */
    @property({ type: Boolean, catalog: "Pointer", readonly: "data.mode!=1", tips: "初始指针的旋转方向，是否为顺时针" })
    public isInitPointerClockwise: boolean = true;
    // =====================  Pointer end  ========================


    // ===================== Outside start  =======================
    /** 外转盘 */
    @property({ type: Laya.Sprite, catalog: "Outside", tips: "外转盘" })
    public outsideDisc: Laya.Sprite;
    /** 初始外转盘的旋转方向，是否为顺时针 */
    @property({ type: Boolean, catalog: "Outside", readonly: "data.mode==1", tips: "初始外转盘的旋转方向，是否为顺时针" })
    public isInitOutsideClockwise: boolean = true;

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
    /** 初始内转盘的旋转方向，是否为顺时针 */
    @property({ type: Boolean, catalog: "Inner", readonly: "data.mode==1||data.mode==2", tips: "初始内转盘的旋转方向，是否为顺时针" })
    public isInitInnerClockwise: boolean = true;

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

        //
        this.setPause(false);

        //this.setPointerAngle(Laya.Utils.toAngle(Math.atan2(this.pointer.y - this._center.y, this.pointer.x - this._center.x)));

        // 根据模式初始化
        switch (this.mode) {
            case LuckWheelMode.SingleRotatePointer:
                this._pointerRotationalObj.setRewardAngle(NaN);
                this._pointerRotationalObj.init(this._pointerAngle, this.isInitPointerClockwise ? 1 : -1);
                break;
            case LuckWheelMode.SingleFixedPointer:
                this._outsideRotationalObj.setRewardAngle(NaN);
                this._outsideRotationalObj.init(this.outsideDisc.rotation, this.isInitOutsideClockwise ? 1 : -1);
                break;
            case LuckWheelMode.DoubleFixedPointer:
                this._outsideRotationalObj.setRewardAngle(NaN);
                this._outsideRotationalObj.init(this.outsideDisc.rotation, this.isInitOutsideClockwise ? 1 : -1);

                this._innerRotationalObj.setRewardAngle(NaN);
                this._innerRotationalObj.init(this.innerDisc.rotation, this.isInitInnerClockwise ? 1 : -1);
                break;
        }

    }

    public onUpdate(): void {
        if ((this._flags & Flag.Rotating) === 0) return;
        if (this._flags & Flag.Pausing) return;

        switch (this.mode) {
            case LuckWheelMode.SingleRotatePointer:
                this._pointerRotationalObj.update();
                this.setPointerAngle(this._pointerRotationalObj.angle360);
                break;
            case LuckWheelMode.SingleFixedPointer:
                this._outsideRotationalObj.update();
                this.outsideDisc.rotation = this._outsideRotationalObj.angle360;
                break;
            case LuckWheelMode.DoubleFixedPointer:
                this._outsideRotationalObj.update();
                this.outsideDisc.rotation = this._outsideRotationalObj.angle360;

                this._innerRotationalObj.update();
                this.innerDisc.rotation = this._innerRotationalObj.angle360;
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

        this._flags |= Flag.Rotating;
        this.setPause(false); // 取消暂停

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
                this.setPointerAngle(this._pointerRotationalObj.angle360);
                break;
            case LuckWheelMode.SingleFixedPointer:
                this._outsideRotationalObj.setAngle(outsideRotation);
                this.outsideDisc.rotation = this._outsideRotationalObj.angle360;
                break;
            case LuckWheelMode.DoubleFixedPointer:
                this._outsideRotationalObj.setAngle(outsideRotation);
                this.outsideDisc.rotation = this._outsideRotationalObj.angle360;
                if (!isNaN(innerRotation)) {
                    this._innerRotationalObj.setAngle(innerRotation);
                    this.innerDisc.rotation = this._innerRotationalObj.angle360;
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

    public onDestroy(): void {
        this._pointerRotationalObj.off(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);
        this._outsideRotationalObj.off(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);
        this._innerRotationalObj.off(RotationalObject.EVENT_ROTATION_COMPLETE, this, this.onRotateComplete);
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
 * 开始旋转时，this 派发 {@link EVENT_START_ROTATION} 事件
 * 
 * 旋转完成时，this 派发 {@link EVENT_ROTATION_COMPLETE} 事件
 */
export class RotationalObject extends Laya.EventDispatcher {

    /** 开始旋转事件(this 派发) */
    public static readonly EVENT_START_ROTATION: string = "eventStartRotation";
    /** 旋转完成事件(this 派发) */
    public static readonly EVENT_ROTATION_COMPLETE: string = "eventRotationComplete";


    /** 当前所在的角 */
    private _angle: number;
    /** 旋转的方向，1或-1 */
    private _rotationSign: number;
    /** 奖励角度 */
    private _rewardAngle: number;
    /** 是否旋转完成 */
    private _isRotationComplete: boolean;
    /** 旋转开始时的角度 */
    private _angleStart: number;
    /** 动画当前时间<毫秒> */
    private _aniTime: number;
    /** 动画的进度 [0, 1] */
    private _normalizedT: number;

    /** 动画总时长<毫秒，大于0的整数>，默认：7000 */
    public aniTotalTime: number = 7000;
    /** 旋转的圈数<大于0的整数>，默认：5 */
    public circles: number = 5;
    /** 贝塞尔缓动数据，https://cubic-bezier.com/ */
    public bezierEaseData: BezierEaseData = { precision: 8, data: [.42, 0, .58, 1] };
    /** 是否显示 log */
    public isShowLogMsg: boolean = false;

    /** 当前所在的角 */
    public get angle(): number { return this._angle; }
    /** 当前所在的角 [0,360] */
    public get angle360(): number { return Laya.MathUtil.repeat(this._angle, 360); }
    /** 奖励角度 */
    public get rewardAngle(): number { return this._rewardAngle; }
    /** 奖励角度[0,360] */
    public get rewardAngle360(): number { return Laya.MathUtil.repeat(this._rewardAngle, 360); }
    /** 是否旋转结束 */
    public get isRotationComplete(): boolean { return this._isRotationComplete; }
    /** 动画的进度 [0, 1] */
    public get normalizedT(): number { return this._normalizedT; }



    /**
     * 初始化
     * @param angle 当前所在的角 [0,360]
     * @param rotationSign 旋转方向, 1或-1
     * @param bezierEaseData 贝塞尔缓动数据
     */
    public init(angle: number, rotationSign: number, bezierEaseData: BezierEaseData = null): void {
        this.setAngle(Laya.MathUtil.repeat(angle, 360));

        this._rotationSign = rotationSign;
        this._normalizedT = 0;

        bezierEaseData && (this.bezierEaseData = bezierEaseData);

        this.setRewardAngle(NaN);
    }

    public update(): void {
        if (this._isRotationComplete) return;
        if (isNaN(this._rewardAngle)) return;

        this._aniTime += Laya.timer.delta;

        const t = Laya.MathUtil.clamp01(Math.trunc(this._aniTime / this.aniTotalTime * 1000) / 1000);
        this._normalizedT = t;

        // 贝塞尔曲线运动
        const tb = Utils.createBezierEase(t, this.bezierEaseData.data[0], this.bezierEaseData.data[1], this.bezierEaseData.data[2], this.bezierEaseData.data[3], this.bezierEaseData.precision);
        const newAngle = Math.trunc(Laya.MathUtil.lerp(this._angleStart, this._rewardAngle, tb) * 100) / 100;
        this.isShowLogMsg && console.log(`动画进度：${t}, tb:${tb}, newAngle:${newAngle}`);
        this.setAngle(newAngle);

        // 旋转完成
        if (t >= 1) {
            this.setAngle(this._rewardAngle);
            this.event(RotationalObject.EVENT_ROTATION_COMPLETE, this);
            this._isRotationComplete = true;
        }
    }

    /**
     * 设置奖励角（将停止在指定的角度）
     * @param value 角度值, NaN：表示不设置
     */
    public setRewardAngle(value: number): void {
        const rewardAngle360 = Laya.MathUtil.repeat(value, 360); // 转为0-360

        this._aniTime = 0;
        this._normalizedT = 0;
        this._isRotationComplete = false;

        // 旋转起始角度
        this._angleStart = this._angle;

        // 旋转的最终角度
        const deltaAngle = this.getDeltaAngle(rewardAngle360);
        this._rewardAngle = this._angleStart + this._rotationSign * (deltaAngle + this.circles * 360);

        // 开始旋转事件
        this.event(RotationalObject.EVENT_START_ROTATION, this);

        this.isShowLogMsg && console.log(`设置奖励角：${rewardAngle360}, 起始角：${this._angleStart}, 最终角度:${this._rewardAngle}`);
    }

    /** 设置角度值 */
    public setAngle(value: number): void {
        this._angle = value;
    }

    /** 获取距离奖励角的度数，根据旋转的方向计算，此值始终为正数 */
    private getDeltaAngle(rewardAngle360: number): number {
        const targetAngle = this._rotationSign >= 0
            ? rewardAngle360
            : (360 - rewardAngle360);
        const currentAngle = this._rotationSign >= 0
            ? this._angle
            : 360 - this._angle;
        return Laya.MathUtil.repeat(targetAngle - currentAngle, 360);
    }
}