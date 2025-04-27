export type EventType = string | symbol;

// An event handler can take an optional event argument
// and should not return a value
export type Handler<T = unknown> = (event: T) => void;
export type WildcardHandler<T = Record<string, unknown>> = (
	type: keyof T,
	event: T[keyof T]
) => void;

export type HandlerListItem<T> = { fn: T, ctx?: any, once?: boolean };

// An array of all currently registered event handlers for a type
export type EventHandlerList<T = unknown> = Array<HandlerListItem<Handler<T>>>;
export type WildCardEventHandlerList<T = Record<string, unknown>> = Array<
	HandlerListItem<WildcardHandler<T>>
>;

// A map of event types and their corresponding event handlers.
export type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<
	keyof Events | '*',
	EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>;

export interface Emitter<Events extends Record<EventType, unknown>> {
	all: EventHandlerMap<Events>;


	on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>, context?: any, once?: boolean): void;
	on(type: '*', handler: WildcardHandler<Events>, context?: any, once?: boolean): void;

	off<Key extends keyof Events>(
		type: Key,
		handler?: Handler<Events[Key]>,
		context?: any
	): void;
	off(type: '*', handler?: WildcardHandler<Events>, context?: any): void;

	emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
	emit<Key extends keyof Events>(
		type: undefined extends Events[Key] ? Key : never
	): void;
}

/**
 * Mitt: Tiny (~200b) functional event emitter / pubsub.
 * @name mitt
 * @returns {Emitter} Mitt
 */
export default function mitt<Events extends Record<EventType, unknown>>(
	all?: EventHandlerMap<Events>
): Emitter<Events> {
	type GenericEventHandler =
		| Handler<Events[keyof Events]>
		| WildcardHandler<Events>;

	all = all || new Map();

	return {
		/**
		 * A Map of event names to registered handler functions.
		 */
		all,

		/**
		 * Register an event handler for the given type.
		 * @param {string|symbol} type Type of event to listen for, or `'*'` for all events
		 * @param {Function} handler Function to call in response to given event
		 * @param {Object} [context] Context to bind method when invoking.
		 * @param {boolean} [once=false] Register handler as one-time handler, i.e. the handler is automatically unregistered once invoked.
		 * @memberOf mitt
		 */
		on<Key extends keyof Events>(type: Key, handler: GenericEventHandler, context?: any, once?: boolean) {
			const handlers: Array<{
				fn: GenericEventHandler,
				ctx?: any,
				once?: boolean
			}> | undefined = all!.get(type);
			const _handler = {
				fn: handler,
				ctx: context,
				once
			};
			if (handlers) {
				handlers.push(_handler);
			} else {
				all!.set(type, [_handler] as EventHandlerList<Events[keyof Events]>);
			}
		},

		/**
		 * Remove an event handler for the given type.
		 * If `handler` is omitted, all handlers of the given type are removed.
		 * @param {string|symbol} type Type of event to unregister `handler` from (`'*'` to remove a wildcard handler)
		 * @param {Function} [handler] Handler function to remove
		 * @param {Object} [context] Context to bind method when invoking.
		 * @memberOf mitt
		 */
		off<Key extends keyof Events>(type: Key, handler?: GenericEventHandler, context?: any) {
			const handlers: Array<HandlerListItem<GenericEventHandler>> | undefined = all!.get(type);
			if (handlers) {
				if (handler) {
					handlers.splice(handlers.findIndex(item => item.fn === handler && item.ctx === context ) >>> 0, 1);
				} else {
					all!.set(type, []);
				}
			}
		},

		/**
		 * Invoke all handlers for the given type.
		 * If present, `'*'` handlers are invoked after type-matched handlers.
		 *
		 * Note: Manually firing '*' handlers is not supported.
		 *
		 * @param {string|symbol} type The event type to invoke
		 * @param {any} [evt] Any value (object is recommended and powerful), passed to each handler
		 * @memberOf mitt
		 */
		emit<Key extends keyof Events>(type: Key, evt?: Events[Key]) {
			let handlers = all!.get(type);
			if (handlers) {
				(handlers as EventHandlerList<Events[keyof Events]>)
					.slice()
					.map((handlerListItem) => {
						const { fn, once, ctx } = handlerListItem;
						fn.call(ctx, evt!);
						if (once) {
							this.off(type, fn, ctx);
						}
					});
			}

			handlers = all!.get('*');
			if (handlers) {
				(handlers as WildCardEventHandlerList<Events>)
					.slice()
					.map((handlerListItem) => {
						const { fn, once, ctx } = handlerListItem;
						fn.call(ctx, type, evt!);
						if (once) {
							this.off('*', fn, ctx);
						}
					});
			}
		}
	};
}
