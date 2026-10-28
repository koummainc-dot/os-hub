import { emptyRelationshipsData } from "./domain.js";

export function buildRelationshipsSeed() {
  const today = new Date().toISOString().slice(0, 10);
  const day = (offset) => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  return {
    ...emptyRelationshipsData(),
    people: [
      { id: "person-demo-family", name: "أحمد محمود", type: "Family", circleId: "circle-family", importance: "high", phone: "", email: "", birthday: "", interests: "القراءة، المشي", matters: "السؤال عن الأسرة ومشاركة الأخبار", notes: "بيانات تجريبية غير حقيقية.", createdAt: today, updatedAt: today },
      { id: "person-demo-friend", name: "سارة علي", type: "Friend", circleId: "circle-friends", importance: "normal", phone: "", email: "", birthday: day(12), interests: "التصوير، القهوة", matters: "تفضّل التواصل برسالة قبل المكالمة", notes: "بيانات تجريبية غير حقيقية.", createdAt: today, updatedAt: today },
      { id: "person-demo-work", name: "محمود حسن", type: "Professional", circleId: "circle-work", importance: "normal", phone: "", email: "", birthday: "", interests: "المنتجات الرقمية", matters: "متابعة التعاون المهني", notes: "بيانات تجريبية غير حقيقية.", createdAt: today, updatedAt: today }
    ],
    circles: [
      { id: "circle-family", name: "العائلة", color: "#0F766E", description: "العائلة والأقارب", createdAt: today },
      { id: "circle-friends", name: "الأصدقاء", color: "#7C3AED", description: "الأصدقاء المقربون", createdAt: today },
      { id: "circle-work", name: "العمل والمعارف المهنية", color: "#2563EB", description: "علاقات العمل والتعاون", createdAt: today }
    ],
    timeline: [
      { id: "timeline-demo-1", personId: "person-demo-family", type: "message", date: day(-2), summary: "رسالة للاطمئنان", notes: "سجل تجريبي." },
      { id: "timeline-demo-2", personId: "person-demo-friend", type: "meeting", date: day(-8), summary: "لقاء ودي", notes: "سجل تجريبي." }
    ],
    followups: [
      { id: "followup-demo-1", personId: "person-demo-family", title: "الاطمئنان على أحمد", dueDate: day(0), status: "open", priority: "normal", notes: "مثال تجريبي." },
      { id: "followup-demo-2", personId: "person-demo-work", title: "متابعة موضوع التعاون", dueDate: day(3), status: "open", priority: "normal", notes: "مثال تجريبي." }
    ],
    occasions: [
      { id: "occasion-demo-1", personId: "person-demo-friend", title: "عيد الميلاد", date: day(12), recurrence: "yearly", reminderDays: 7, notes: "" }
    ],
    gifts: [
      { id: "gift-demo-1", personId: "person-demo-friend", idea: "ألبوم صور صغير", occasionId: "occasion-demo-1", status: "idea", budget: "", notes: "اقتراح تجريبي فقط." }
    ]
  };
}
