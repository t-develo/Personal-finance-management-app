import React, { useState } from "react";
import Modal from "./ui/Modal";
import InputField from "./ui/InputField";
import EmptyState from "./ui/EmptyState";
import { useToast } from "../hooks/useToast";
import { fmt } from "../utils/finance";

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
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e4e8ef",
    marginBottom: 8,
  },
  cardBalance: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 22,
    fontWeight: 500,
    color: "#4f8cff",
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

export default function AccountsTab({ data }) {
  const { accounts, addAccount, editAccount, removeAccount } = data;
  const [modal, setModal] = useState(null);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToast();

  const openAdd = () => {
    setName("");
    setBalance("");
    setModal({ mode: "add" });
  };

  const openEdit = (item) => {
    setName(item.name);
    setBalance(String(item.balance));
    setModal({ mode: "edit", item });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { name, balance: parseFloat(balance) || 0 };
      if (modal.mode === "add") {
        await addAccount(payload);
        showToast({ type: "success", message: "口座を追加しました" });
      } else {
        await editAccount(modal.item.id, payload);
        showToast({ type: "success", message: "口座を更新しました" });
      }
      setModal(null);
    } catch (e) {
      showToast({ type: "error", message: `操作に失敗しました: ${e.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("この口座を削除しますか？紐付く固定支払いの引落口座設定も解除されます。")) {
      try {
        await removeAccount(id);
        showToast({ type: "success", message: "口座を削除しました" });
      } catch (e) {
        showToast({ type: "error", message: `削除に失敗しました: ${e.message}` });
      }
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>口座管理</h2>
        <button style={styles.addBtn} onClick={openAdd}>
          + 追加
        </button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon="🏦" message="口座を追加してください" />
      ) : (
        <div style={styles.grid}>
          {accounts.map((acc) => (
            <div key={acc.id} style={styles.card}>
              <div style={styles.cardName}>{acc.name}</div>
              <div style={styles.cardBalance}>{fmt(acc.balance)}</div>
              <div style={styles.actions}>
                <button style={styles.editBtn} onClick={() => openEdit(acc)}>
                  編集
                </button>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(acc.id)}
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
          title={modal.mode === "add" ? "口座を追加" : "口座を編集"}
          onClose={() => !submitting && setModal(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
        >
          <InputField
            label="口座名"
            value={name}
            onChange={setName}
            placeholder="例: 三菱UFJ銀行"
            required
          />
          <InputField
            label="残高"
            type="number"
            value={balance}
            onChange={setBalance}
            placeholder="0"
            step="1"
          />
        </Modal>
      )}
    </div>
  );
}
