"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "../ui/sheet";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "../ui/select";
import * as XLSX from "xlsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SelectValue } from "@radix-ui/react-select";

export default function KassirPage() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [doctors, setDoctors] = useState({});
  const [dateFilter, setDateFilter] = useState({ from: null, to: null });
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("20"); // Default number of items per page

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "patients"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const clientsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsList);
        setFilteredClients(clientsList);
      }
    );

    fetchDoctors();

    return () => unsubscribe();
  }, []);

  const fetchDoctors = async () => {
    const querySnapshot = await getDocs(collection(db, "doctors"));
    const doctorsData = {};
    querySnapshot.forEach((doc) => {
      const doctorData = doc.data();
      doctorsData[doctorData.id] = doctorData.name; // Firebase hujjat ichidagi `id` maydonini ishlatyapmiz
    });
    setDoctors(doctorsData);
  };

  const handlePayment = async () => {
    if (!selectedClient || paymentAmount <= 0 || !paymentType) return;

    const newPaid = selectedClient.paid + parseFloat(paymentAmount);
    const newStatus =
      newPaid >= selectedClient.totalPrice ? "To‘langan" : "To‘liq to‘lanmagan";

    await updateDoc(doc(db, "patients", selectedClient.id), {
      paid: newPaid,
      status: newStatus,
    });

    await addDoc(collection(db, "transactions"), {
      patientId: selectedClient.id,
      amount: Number(paymentAmount),
      paymentType,
      date: serverTimestamp(),
    });

    const totalServicePrice = selectedClient.services.reduce(
      (sum, service) => sum + service.price,
      0
    );
    const bonusAmount = totalServicePrice * 0.5;
    const doctorId = selectedClient.doctor;

    await addDoc(collection(db, "bonuses"), {
      doctorId,
      patientId: selectedClient.id,
      amount: bonusAmount,
      date: serverTimestamp(),
    });

    setSelectedClient(null);
    setPaymentAmount(0);
    setPaymentType("");
  };

  const fetchTransactions = async (clientId) => {
    const q = query(
      collection(db, "transactions"),
      where("patientId", "==", clientId)
    );
    const querySnapshot = await getDocs(q);
    const transactionsList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTransactions(transactionsList);
  };

  const handleFilter = () => {
    let filtered = [...clients];
    if (dateFilter.from && dateFilter.to) {
      filtered = filtered.filter(
        (client) =>
          new Date(client.createdAt.toDate()) >= new Date(dateFilter.from) &&
          new Date(client.createdAt.toDate()) <= new Date(dateFilter.to)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((client) => client.status === statusFilter);
    }
    setFilteredClients(filtered);
  };

  const clearFilters = () => {
    setDateFilter({ from: null, to: null }); // Sanalarni boshlang'ich qiymatga qaytarish
    setStatusFilter(""); // Statusni boshlang'ich qiymatga qaytarish
    setFilteredClients(clients); // Barcha mijozlarni ko'rsatish
  };

  const handleDelete = async (clientId) => {
    await deleteDoc(doc(db, "patients", clientId));
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredClients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients.xlsx");
  };

  const totalSum = filteredClients.reduce(
    (sum, client) => sum + (client.totalPrice || 0),
    0
  );

  const totalPaid = filteredClients.reduce(
    (sum, client) => sum + (client.paid || 0),
    0
  );
  const totalRemaining = totalSum - totalPaid;

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Pagination uchun hisoblash
  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredClients.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e));
    setCurrentPage(1); // Reset to the first page when items per page changes
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Kassir sahifasi</h1>

      <div className="flex gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium">Boshlanish sanasi</label>
          <Input
            type="date"
            onChange={(e) =>
              setDateFilter((prev) => ({ ...prev, from: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Tugash sanasi</label>
          <Input
            type="date"
            onChange={(e) =>
              setDateFilter((prev) => ({ ...prev, to: e.target.value }))
            }
          />
        </div>

        <div className="w-[200px]">
          <Select onValueChange={(value) => setStatusFilter(value)}>
            <SelectTrigger>{statusFilter || "Statusni tanlang"}</SelectTrigger>
            <SelectContent>
              <SelectItem value="To‘langan">To‘langan</SelectItem>
              <SelectItem value="To‘liq to‘lanmagan">
                To‘liq to‘lanmagan
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleFilter}>Filtrlash</Button>
        <Button onClick={clearFilters} variant="destructive">
          Tozalsh
        </Button>
        <Button onClick={exportToExcel}>Excelga yuklash</Button>
      </div>

      <div className="mb-4 flex gap-4">
        <p className="py-1 px-4 bg-blue-400 rounded-md">
          Jami summa: {totalSum.toLocaleString()}
        </p>
        <p className="py-1 px-4 bg-green-400 rounded-md">
          To‘langan summa: {totalPaid.toLocaleString()}
        </p>
        <p className="py-1 px-4 bg-red-400 rounded-md">
          Qoldiq summa: {totalRemaining.toLocaleString()}
        </p>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2 items-center">
          <Button onClick={handlePreviousPage} disabled={currentPage === 1}>
            <ChevronLeft />
          </Button>
          {currentPage} / {totalPages}
          <Button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight />
          </Button>
        </div>
        <div>
          <Select
            id="itemsPerPage"
            defaultValue={itemsPerPage}
            onValueChange={handleItemsPerPageChange}
            className="border p-2 rounded"
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="40">40</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="60">60</SelectItem>
              <SelectItem value="70">70</SelectItem>
              <SelectItem value="80">80</SelectItem>
              <SelectItem value="90">90</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="300">300</SelectItem>
              <SelectItem value="400">400</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>№</TableCell>
              <TableCell>FIO</TableCell>
              <TableCell>Doktor</TableCell>
              <TableCell>Chegirma</TableCell>
              <TableCell>Jami summa</TableCell>
              <TableCell>To'ladi</TableCell>
              <TableCell>Qoldiq</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Yaratilgan sana</TableCell>
              <TableCell>Amallar</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((client, idx) => {
              const qoldiq = client.totalPrice - client.paid;
              return (
                <TableRow
                  key={client.id}
                  className={
                    client.status === "To‘langan"
                      ? "bg-green-500"
                      : client.status === "To‘liq to‘lanmagan"
                      ? "bg-yellow-500"
                      : "bg-white"
                  }
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    {client.lastName} {client.firstName}
                  </TableCell>
                  <TableCell>{doctors[client.doctor] || "Noma'lum"}</TableCell>
                  <TableCell>{client.discount}</TableCell>
                  <TableCell>{client.totalPrice?.toLocaleString()}</TableCell>
                  <TableCell>{client.paid?.toLocaleString()}</TableCell>
                  <TableCell>{qoldiq?.toLocaleString()}</TableCell>
                  <TableCell>{client.status}</TableCell>
                  <TableCell>
                    {client.createdAt?.toDate().toLocaleString() || "Noma'lum"}
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => handleDelete(client.id)}>
                      O‘chirish
                    </Button>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          onClick={() => {
                            setSelectedClient(client);
                            fetchTransactions(client.id);
                          }}
                        >
                          To‘lov qilish
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>To‘lov oynasi</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4 mt-4">
                          <div className="flex items-center gap-4">
                            <p className="bg-blue-300 py-1 px-3 rounded-md">
                              Ja'mi summa: {client.totalPrice?.toLocaleString()}
                            </p>
                            <p className="bg-green-300 py-1 px-3 rounded-md">
                              To'landi: {client.paid?.toLocaleString()}
                            </p>
                            <p className="bg-red-300 py-1 px-3 rounded-md">
                              Qoldiq: {qoldiq?.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="flex gap-4">
                              <div>
                                <label className="block text-sm font-medium">
                                  To‘lov turi
                                </label>
                                <Select
                                  onValueChange={(value) =>
                                    setPaymentType(value)
                                  }
                                >
                                  <SelectTrigger>
                                    {paymentType || "To‘lov turini tanlang"}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Naqd">Naqd</SelectItem>
                                    <SelectItem value="Plastik">
                                      Plastik
                                    </SelectItem>
                                    <SelectItem value="Bank o‘tkazmasi">
                                      Bank o‘tkazmasi
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium">
                                To‘lov summasi
                              </label>
                              <Input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) =>
                                  setPaymentAmount(e.target.value)
                                }
                              />
                            </div>
                            <Button onClick={handlePayment}>
                              To‘lovni tasdiqlash
                            </Button>
                          </div>
                        </div>
                        <div className="mt-5 grid grid-cols-4 items-center bg-gray-500">
                          <div className="border-r py-2 px-4">#</div>
                          <div className="border-r py-2 px-4">Summa</div>
                          <div className="border-r py-2 px-4">Sana</div>
                          <div className="border-r py-2 px-4">To'lov turi</div>
                        </div>
                        <div className="">
                          {transactions.map((item, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-4 items-center border-b border-r border-l"
                            >
                              <div className="py-2 px-4 border-r">
                                {idx + 1}
                              </div>
                              <div className="py-2 px-4 border-r">
                                {item.amount?.toLocaleString()}
                              </div>
                              <div className="py-2 px-4 border-r">
                                {item.date?.toDate().toLocaleString()}
                              </div>
                              <div className="py-2 px-4 border-r">
                                {item.paymentType}
                              </div>
                            </div>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
