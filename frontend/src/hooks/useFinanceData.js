import { useState, useEffect, useCallback } from "react";
import * as api from "../api/client";

export function useFinanceData(yearMonth) {
  const [accounts, setAccounts] = useState([]);
  const [fixedPayments, setFixedPayments] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [monthlyRecords, setMonthlyRecords] = useState({
    accountBalances: {},
    cardPayments: {},
  });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, fps, ccs, mr] = await Promise.all([
        api.getAccounts(),
        api.getFixedPayments(),
        api.getCreditCards(),
        api.getMonthlyRecords(yearMonth),
      ]);
      setAccounts(accs);
      setFixedPayments(fps);
      setCreditCards(ccs);
      setMonthlyRecords(mr);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Accounts
  const addAccount = useCallback(async (data) => {
    const created = await api.createAccount(data);
    setAccounts((prev) => [...prev, created]);
    return created;
  }, []);

  const editAccount = useCallback(async (id, data) => {
    const updated = await api.updateAccount(id, data);
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    return updated;
  }, []);

  const removeAccount = useCallback(
    async (id) => {
      await api.deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      // Clear accountId references in fixedPayments locally
      setFixedPayments((prev) =>
        prev.map((fp) =>
          fp.accountId === id ? { ...fp, accountId: "" } : fp
        )
      );
    },
    []
  );

  // Fixed Payments
  const addFixedPayment = useCallback(async (data) => {
    const created = await api.createFixedPayment(data);
    setFixedPayments((prev) => [...prev, created]);
    return created;
  }, []);

  const editFixedPayment = useCallback(async (id, data) => {
    const updated = await api.updateFixedPayment(id, data);
    setFixedPayments((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updated } : f))
    );
    return updated;
  }, []);

  const removeFixedPayment = useCallback(async (id) => {
    await api.deleteFixedPayment(id);
    setFixedPayments((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Credit Cards
  const addCreditCard = useCallback(async (data) => {
    const created = await api.createCreditCard(data);
    setCreditCards((prev) => [...prev, created]);
    return created;
  }, []);

  const editCreditCard = useCallback(async (id, data) => {
    const updated = await api.updateCreditCard(id, data);
    setCreditCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
    return updated;
  }, []);

  const removeCreditCard = useCallback(async (id) => {
    await api.deleteCreditCard(id);
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Monthly Records
  const saveMonthly = useCallback(
    async (data) => {
      const saved = await api.saveMonthlyRecords(yearMonth, data);
      setMonthlyRecords(saved);
      return saved;
    },
    [yearMonth]
  );

  const reloadMonthly = useCallback(async () => {
    const mr = await api.getMonthlyRecords(yearMonth);
    setMonthlyRecords(mr);
  }, [yearMonth]);

  return {
    accounts,
    fixedPayments,
    creditCards,
    monthlyRecords,
    loading,
    reload: loadAll,
    addAccount,
    editAccount,
    removeAccount,
    addFixedPayment,
    editFixedPayment,
    removeFixedPayment,
    addCreditCard,
    editCreditCard,
    removeCreditCard,
    saveMonthly,
    reloadMonthly,
  };
}
