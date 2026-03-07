import React, { useState } from "react";
import Modal from "./ui/Modal";
import InputField from "./ui/InputField";
import SelectField from "./ui/SelectField";
import EmptyState from "./ui/EmptyState";
import { useToast } from "../hooks/useToast";

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
    flexWrap: "wrap",
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
    minHeight: 44,
    whiteSpace: "nowrap",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  cardInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e4e8ef",
  },
  cardAccount: {
    fontSize: 13,
    color: "#6b7585",
  },
  actions: {
    display: "flex",
    gap: 8,
  },
  editBtn: {
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

export default function CreditCardsTab({ data }) {
  const { accounts, creditCards, addCreditCard, editCreditCard, removeCreditCard } = data;
  const [modal, setModal] = useState(null);
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToast();

  const accountOptions = [
    { value: "", label: "未設定" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const openAdd = () => {
    setName("");
    setAccountId("");
    setModal({ mode: "add" });
  };

  const openEdit = (item) => {
    setName(item.name);
    setAccountId(item.accountId || "");
    setModal({ mode: "edit", item });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { name, accountId };
      if (modal.mode === "add") {
        await addCreditCard(payload);
        showToast({ type: "success", message: "カードを追加しました" });
      } else {
        await editCreditCard(modal.item.id, payload);
        showToast({ type: "success", message: "カードを更新しました" });
      }
      setModal(null);
    } catch (e) {
      showToast({ type: "error", message: `操作に失敗しました: ${e.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("このクレジットカードを削除しますか？")) {
      try {
        await removeCreditCard(id);
        showToast({ type: "success", message: "カードを削除しました" });
      } catch (e) {
        showToast({ type: "error", message: `削除に失敗しました: ${e.message}` });
      }
    }
  };

  const getAccountName = (accId) =>
    accounts.find((a) => a.id === accId)?.name || null;

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>クレジットカード管理</h2>
        <button style={styles.addBtn} onClick={openAdd}>
          + 追加
        </button>
      </div>

      {creditCards.length === 0 ? (
        <EmptyState icon="💳" message="クレジットカードを追加してください" />
      ) : (
        <div style={styles.grid}>
          {creditCards.map((cc) => (
            <div key={cc.id} style={styles.card}>
              <div style={styles.cardInfo}>
                <div style={styles.cardName}>{cc.name}</div>
                {getAccountName(cc.accountId) && (
                  <div style={styles.cardAccount}>
                    引落: {getAccountName(cc.accountId)}
                  </div>
                )}
              </div>
              <div style={styles.actions}>
                <button style={styles.editBtn} onClick={() => openEdit(cc)}>
                  編集
                </button>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(cc.id)}
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
          title={modal.mode === "add" ? "カードを追加" : "カードを編集"}
          onClose={() => !submitting && setModal(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
        >
          <InputField
            label="カード名"
            value={name}
            onChange={setName}
            placeholder="例: 楽天カード"
            required
          />
          <SelectField
            label="引き落とし口座"
            value={accountId}
            onChange={setAccountId}
            options={accountOptions}
          />
        </Modal>
      )}
    </div>
  );
}
