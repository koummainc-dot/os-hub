// Knowledge OS owns meeting templates; Projects consumes these as read-only references.
export const MEETING_TEMPLATES = [
  { id: "daily-standup", name: "Daily Standup", sections: ["ماذا أنجزنا أمس؟", "ماذا سننجز اليوم؟", "عوائق محتملة؟", "Action Items"] },
  { id: "weekly-sync", name: "Weekly Sync", sections: ["ماذا حدث الأسبوع الماضي؟", "ماذا نعمل هذا الأسبوع؟", "عوائق؟", "Action Items"] },
  { id: "sprint-planning", name: "Sprint Planning", sections: ["هدف الدورة", "Backlog الملتزم به", "الفريق والأدوار", "ملاحظات"] },
  { id: "post-mortem", name: "Post-mortem", sections: ["الأثر على المستخدم", "الجدول الزمني", "المقاييس", "تحليل السبب", "الحل وما نجح/ما يُحسَّن", "أعمال مستقبلية", "Action Items"] },
  { id: "ad-hoc", name: "Ad Hoc", sections: ["الأجندة", "الملاحظات", "القرارات", "Action Items"] },
];
