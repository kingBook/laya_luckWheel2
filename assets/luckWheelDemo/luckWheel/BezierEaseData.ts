/** 贝塞尔缓动数据 */
export interface BezierEaseData {
    /** 精度<正整数> */
    precision:number;
    /** 贝塞尔曲线数据(长度为 4): https://cubic-bezier.com/ */
    data:number[];
}