import React, { useState } from "react";
import Modal from "./ui/Modal";
import InputField from "./ui/InputField";
import SelectField from "./ui/SelectField";
import EmptyState from "./ui/EmptyState";

function fmt(n) {
  return "¥" + Number(n || 0).toLocaleString("ja-JP");
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: 700 },
  addBtn: {
    background: "#4f8cff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#161b24",
    border: "1px solid #1e2530",
    borderRadius: 12,
    padding: 20,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e4e8ef",
    marginBottom: 4,
  },
  cardAccount: {
    fontSize: 13,
    color: "#6b7585",
    marginBottom: 8,
  },
  cardAmount: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 20,
    fontWeight: 500,
    color: "#f0a0c0",
    marginBottom: 16,
  },
  actions: {
    display: "flex",
    gap: 8,
  },
  editBtn: {
    flex: 1,
    background: "#1e2530",
    color: "#8b95a5",
    border: "1px solid #2a3040",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#1e2530",
    color: "#f87171",
    border: "1px solid #2a3040",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
};

export default function FixedPaymentsTab({ data }) {
  const { accounts, fixedPayments, addFixedPayment, editFixedPayment, removeFixedPayment } =
    data;
  const [modal, setModal] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");

  const accountOptions = [
    { value: "", label: "未設定" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const openAdd = () => {
    setName("");
    setAmount("");
    setAccountId("");
    setModal({ mode: "add" });
  };

  const openEdit = (item) => {
    setName(item.name);
    setAmount(String(item.amount));
    setAccountId(item.accountId || "");
    setModal({ mode: "edit", item });
  };

  const handleSubmit = async () => {
    const payload = {
      name,
      amount: parseFloat(amount) || 0,
      accountId,
    };
    if (modal.mode === "add") {
      await addFixedPayment(payload);
    } else {
      await editFixedPayment(modal.item.id, payload);
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("この固定支払いを削除しますか？")) {
      await removeFixedPayment(id);
    }
  };

  const getAccountName = (accId) =>
    accounts.find((a) => a.id === accId)?.name || "未設定";

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>固定支払い管理</h2>
        <button style={styles.addBtn} onClick={openAdd}>
          + 追加
        </button>
      </div>

      {fixedPayments.length === 0 ? (
        <EmptyState icon="📋" message="固定支払いを追加してください" />
      ) : (
        <div style={styles.grid}>
          {fixedPayments.map((fp) => (
            <div key={fp.id} style={styles.card}>
              <div style={styles.cardName}>{fp.name}</div>
              <div style={styles.cardAccount}>
                引落: {getAccountName(fp.accountId)}
              </div>
              <div style={styles.cardAmount}>{fmt(fp.amount)}</div>
              <div style={styles.actions}>
                <button style={styles.editBtn} onClick={() => openEdit(fp)}>
                  編集
                </button>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(fp.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === "add" ? "固定支払いを追加" : "固定支払いを編集"}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        >
          <InputField
            label="項目名"
            value={name}
            onChange={setName}
            placeholder="例: 家賃"
            required
          />
          <InputField
            label="金額"
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="0"
            step="1"
          />
          <SelectField
            label="引落口座"
            value={accountId}
            onChange={setAccountId}
            options={accountOptions}
          />
        </Modal>
      )}
    </div>
  );
}
