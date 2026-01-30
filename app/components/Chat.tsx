"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
	id: string;
	text: string;
	author: "user" | "peer";
};

function createId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Chat() {
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(true);
	const [isCalling, setIsCalling] = useState(false);
	const [phone, setPhone] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const phoneRef = useRef<HTMLInputElement | null>(null);
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const modalTimerRef = useRef<number | null>(null);
	const mockReply = "Здесь отображается распознанная речь собеседника";

	function sendMessage() {
		const trimmed = message.trim();
		if (!trimmed) {
			return;
		}
		setMessages((current) => [
			...current,
			{ id: createId(), text: trimmed, author: "user" },
		]);
		setMessage("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		sendMessage();
	}

	function handleSimulateResponse() {
		setMessages((current) => [
			...current,
			{ id: createId(), text: mockReply, author: "peer" },
		]);
	}

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [messages.length]);

	useEffect(() => {
		return () => {
			if (modalTimerRef.current) {
				window.clearTimeout(modalTimerRef.current);
			}
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.src = "";
			}
		};
	}, []);

	useEffect(() => {
		if (isModalOpen) {
			phoneRef.current?.focus();
		} else {
			textareaRef.current?.focus();
		}
	}, [isModalOpen]);

	function handleCall() {
		if (!phone.trim()) {
			phoneRef.current?.focus();
			return;
		}
		setIsCalling(true);
		modalTimerRef.current = window.setTimeout(() => {
			setIsCalling(false);
			setIsModalOpen(false);
		}, 2500);
	}

	async function handleListen(entry: ChatMessage) {
		setActiveAudioId(entry.id);
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.src = "";
		} else {
			audioRef.current = new Audio();
		}

		try {
			const response = await fetch("/api/tts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: entry.text }),
			});

			if (!response.ok) {
				setActiveAudioId(null);
				return;
			}

			const blob = await response.blob();
			const objectUrl = URL.createObjectURL(blob);
			const audio = audioRef.current;
			if (!audio) {
				URL.revokeObjectURL(objectUrl);
				setActiveAudioId(null);
				return;
			}

			audio.src = objectUrl;
			audio.onended = () => {
				URL.revokeObjectURL(objectUrl);
				setActiveAudioId(null);
			};
			audio.onerror = () => {
				URL.revokeObjectURL(objectUrl);
				setActiveAudioId(null);
			};
			await audio.play();
		} catch {
			setActiveAudioId(null);
		}
	}

	return (
		<div className="min-h-screen bg-white">
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
					<div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
						<h2 className="text-lg font-semibold text-zinc-900">
							Введите номер телефона
						</h2>
						<p className="mt-2 text-sm text-zinc-600">
							Оператор свяжется с вами после подтверждения.
						</p>
						<input
							ref={phoneRef}
							type="tel"
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									handleCall();
								}
							}}
							placeholder="+7 (___) ___-__-__"
							className="mt-4 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
						/>
						<button
							type="button"
							onClick={handleCall}
							disabled={isCalling}
							className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-70"
						>
							{isCalling ? (
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
							) : (
								"Позвонить"
							)}
						</button>
					</div>
				</div>
			)}
			<div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 pt-10 pb-28">
				<div className="flex-1 overflow-y-auto">
					<div className="flex flex-col gap-3">
						{messages.map((entry) => (
							<div
								key={entry.id}
								className={`flex w-fit max-w-[45%] items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 shadow-sm ${entry.author === "user" ? "ml-auto" : "mr-auto"
									}`}
							>
								<p className="whitespace-pre-wrap break-words leading-relaxed">
									{entry.text}
								</p>
								<button
									type="button"
									onClick={() => handleListen(entry)}
									className="flex shrink-0 items-center text-zinc-600 transition hover:cursor-pointer hover:text-zinc-900 disabled:cursor-default disabled:opacity-60"
									disabled={activeAudioId === entry.id}
									aria-label="Прослушать"
								>
									<img
										src="/sound.svg"
										alt="Прослушать"
										className="h-4 w-4 transition"
									/>
								</button>
							</div>
						))}
					</div>
				</div>
			</div>

			<form
				className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white"
				onSubmit={handleSubmit}
			>
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-end">
					<div className="flex w-full items-end gap-3">
						<textarea
							ref={textareaRef}
							id="message"
							name="message"
							value={message}
							onChange={(event) => {
								setMessage(event.target.value);
								const target = event.currentTarget;
								target.style.height = "auto";
								target.style.height = `${target.scrollHeight}px`;
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter" && !event.shiftKey) {
									event.preventDefault();
								sendMessage();
							}
						}}
							placeholder="Введите сообщение"
							rows={1}
							className="max-h-[45vh] min-h-[48px] w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
						/>
						<button
							type="submit"
							className="h-12 shrink-0 cursor-pointer rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
						>
							Отправить
						</button>
					</div>
					<button
						type="button"
						onClick={handleSimulateResponse}
						className="h-12 w-full cursor-pointer rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:w-auto"
					>
						Симулировать ответ
					</button>
				</div>
			</form>
			<div ref={bottomRef} />
		</div>
	);
}
