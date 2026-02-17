import React, { useState } from "react";
import Modal from "./ui/Modal";
import InputField from "./ui/InputField";
import EmptyState from "./ui/EmptyState";

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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e4e8ef",
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
  const { creditCards, addCreditCard, editCreditCard, removeCreditCard } = data;
  const [modal, setModal] = useState(null);
  const [name, setName] = useState("");

  const openAdd = () => {
    setName("");
    setModal({ mode: "add" });
  };

  const openEdit = (item) => {
    setName(item.name);
    setModal({ mode: "edit", item });
  };

  const handleSubmit = async () => {
    if (modal.mode === "add") {
      await addCreditCard({ name });
    } else {
      await editCreditCard(modal.item.id, { name });
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("このクレジットカードを削除しますか？")) {
      await removeCreditCard(id);
    }
  };

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
              <div style={styles.cardName}>{cc.name}</div>
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
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        >
          <InputField
            label="カード名"
            value={name}
            onChange={setName}
            placeholder="例: 楽天カード"
            required
          />
        </Modal>
      )}
    </div>
  );
}
