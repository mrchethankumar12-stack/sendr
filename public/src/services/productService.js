// src/services/productService.js
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function addProduct(data) {
  return await addDoc(collection(db, "products"), data);
}

export async function updateProduct(id, data) {
  return await updateDoc(doc(db, "products", id), data);
}

export async function deleteProduct(id) {
  return await deleteDoc(doc(db, "products", id));
}

