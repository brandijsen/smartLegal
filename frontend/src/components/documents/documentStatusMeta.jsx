import {
  FiClock,
  FiLoader,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

export const DOCUMENT_STATUS_META = {
  pending: {
    label: "Pending",
    icon: <FiClock />,
    className: "bg-slate-100 text-slate-700",
  },
  processing: {
    label: "Processing",
    icon: <FiLoader className="animate-spin" />,
    className: "bg-amber-100 text-amber-700",
  },
  done: {
    label: "Done",
    icon: <FiCheckCircle />,
    className: "bg-emerald-100 text-emerald-700",
  },
  failed: {
    label: "Failed",
    icon: <FiXCircle />,
    className: "bg-red-100 text-red-700",
  },
};
