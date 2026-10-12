import { prisma } from "@/lib/db";
import { SITE_SETTING_ID } from "@/lib/site-settings";

/** 관리자가 광고 문의 목록을 마지막으로 연 뒤 들어온 문의 수 */
export async function unseenInquiryCount() {
  const setting = await prisma.siteSetting.findUnique({
    where: { id: SITE_SETTING_ID },
    select: { inquirySeenAt: true },
  });
  return prisma.auditLog.count({
    where: { kind: "AD_INQUIRY", ...(setting?.inquirySeenAt ? { createdAt: { gt: setting.inquirySeenAt } } : {}) },
  });
}

/** 광고 문의 목록을 열면 모두 읽음으로 */
export async function markInquiriesSeen() {
  const now = new Date();
  await prisma.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: { id: SITE_SETTING_ID, inquirySeenAt: now },
    update: { inquirySeenAt: now },
  });
}
