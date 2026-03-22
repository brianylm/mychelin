"use client";

import { useState } from "react";
import { Box } from "lucide-react";

interface FridgeItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
}

const CATEGORIES = ["Vegetables", "Meat", "Seafood", "Dairy", "Eggs", "Fruits", "Condiments", "Other"];

export default function FridgePage() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [newItem, setNewItem] = useState({ name: "", quantity: "", category: "Other" });

  const addItem = () => {
    if (!newItem.name.trim()) return;
    
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        name: newItem.name,
        quantity: newItem.quantity,
        category: newItem.category,
      },
    ]);
    setNewItem({ name: "", quantity: "", category: "Other" });
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const groupedItems = CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((item) => item.category === cat),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <Box className="w-8 h-8 text-terracotta" />
        <h1 className="text-4xl font-bold text-stone-900 font-heading">My Fridge</h1>
      </div>
      <p className="text-stone-500 mb-10 text-lg leading-relaxed">Keep track of what you have at home</p>

      {/* Add Item Form */}
      <div className="bg-white rounded-3xl p-8 border border-stone-200 mb-10">
        <h2 className="text-xl font-semibold text-stone-800 mb-5 font-heading">Add an Item</h2>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="What do you have?"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-full px-4 py-3.5 text-lg border border-stone-200 rounded-xl focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          />
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Amount"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              className="flex-1 min-w-0 px-4 py-3.5 text-lg border border-stone-200 rounded-xl focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="flex-1 min-w-0 px-4 py-3.5 text-lg border border-stone-200 rounded-xl focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addItem}
            className="w-full px-8 py-4 bg-terracotta text-white rounded-xl text-lg font-semibold hover:bg-terracotta-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Items List */}
      {groupedItems.length > 0 ? (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <div key={group.category} className="bg-white rounded-3xl p-8 border border-stone-200">
              <h3 className="text-lg font-semibold text-stone-800 mb-5 font-heading">{group.category}</h3>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0"
                  >
                    <span className="text-base text-stone-800 leading-relaxed">
                      {item.name}
                      {item.quantity && <span className="text-stone-400 ml-2">({item.quantity})</span>}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Box className="w-8 h-8 text-stone-400" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-3 font-heading">Your fridge is empty</h2>
          <p className="text-stone-500 text-lg leading-relaxed">Add items to keep track of what you have</p>
        </div>
      )}
    </div>
  );
}
