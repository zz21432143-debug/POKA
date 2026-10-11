/** 휴대폰 "POKA 앱 다운로드" 띠를 닫은 시각 저장 키 */
export const STRIP_KEY = "poka-app-strip-hidden-until";
export const STRIP_HIDE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 첫 화면을 그리기 전에 실행하는 짧은 스크립트(layout.tsx <head>).
 * 띠를 닫아 둔 기간이면 html에 표시를 달아 CSS가 처음부터 숨기게 합니다(깜빡임 방지).
 */
export const APP_STRIP_BOOT_SCRIPT = `try{if(Number(localStorage.getItem("${STRIP_KEY}")||0)>Date.now())document.documentElement.setAttribute("data-app-strip","hidden")}catch(e){}`;
