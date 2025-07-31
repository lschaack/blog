"use client";

import { createContext, FC, ReactNode, useContext, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type Serializable = string | number | boolean | object;
export type DefaultValueOrGetter<T> = T | (() => T);
export type QueryParamConfig<T extends Serializable> = Record<string, DefaultValueOrGetter<T>>;

class QueryParamManager {
  private serialize: <V>(value: V) => string;
  private deserialize: <V>(stringValue: string) => V;
  private _handleChange: (path: string) => void;
  private searchParams: URLSearchParams;
  private parsedValues: Map<string, Serializable>;
  private pathname: string;
  private isDirty: boolean;

  public static extractDefault = <T extends Serializable>(defaultValueOrGetter: T | (() => T)) => {
    const isGetter = typeof defaultValueOrGetter === 'function';

    if (isGetter) {
      return (defaultValueOrGetter as () => T)();
    } else {
      return defaultValueOrGetter;
    }
  }

  constructor(
    config: QueryParamConfig<Serializable>,
    pathname: string,
    searchParams: URLSearchParams,
    onChange: (path: string) => void,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  ) {
    this.serialize = serialize;
    this.deserialize = deserialize;
    this._handleChange = onChange;
    this.searchParams = searchParams;
    this.parsedValues = new Map<string, Serializable>();
    this.pathname = pathname;
    this.isDirty = false;

    for (const [name, defaultValueOrGetter] of Object.entries(config)) {
      this.isDirty = this.configure(name, defaultValueOrGetter, false);
    }
  }

  // @return Whether or not the URL state is dirty after configuration
  public configure<T extends Serializable>(
    name: string,
    defaultValueOrGetter: DefaultValueOrGetter<T>,
    publishChange = true
  ) {
    const existingValue = this.parsedValues.get(name);

    if (existingValue !== undefined) {
      // TODO: It's probably fine if query params are reconfigured, I just want to make sure that
      // behavior is well-defined if I run into a use case where I need it rather than doing it
      // halfway right now
      throw new Error(
        `Attempting to reconfigure query param "${name}" with existing value ${existingValue}`
      );
    }

    const requestedValue = this.searchParams.get(name);
    const value = requestedValue !== null
      ? this.deserialize<T>(requestedValue)
      : QueryParamManager.extractDefault(defaultValueOrGetter);

    this.set(name, value, publishChange);

    if (!requestedValue) {
      return true;
    } else {
      return false;
    }
  }

  public handleChange(path: string) {
    this._handleChange(path);
    this.isDirty = false;
  }

  public publish() {
    if (this.isDirty) {
      this.handleChange(this.getPath());
    }
  }

  public set<T extends Serializable>(key: string, value: T, publishChange = true) {
    if (this.parsedValues.get(key) !== value) {
      this.parsedValues.set(key, value);
      this.searchParams.set(key, this.serialize(value));

      if (publishChange) this._handleChange(this.getPath());
      else this.isDirty = true;
    }
  }

  public get<T extends Serializable>(key: string) {
    return this.parsedValues.get(key) as T;
  }

  public has(key: string) {
    return this.parsedValues.has(key);
  }

  private getPath() {
    return `${this.pathname}?${this.searchParams}`;
  }
}

const QueryParamContext = createContext<QueryParamManager | null>(null);

type QueryParamProviderProps = {
  config: QueryParamConfig<Serializable>,
  children: ReactNode,
};
export const QueryParamProvider: FC<QueryParamProviderProps> = ({ config, children }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const manager = useMemo(() => new QueryParamManager(
    config,
    pathname,
    new URLSearchParams(searchParams.toString()),
    router.push,
  ), [config, pathname, router.push, searchParams]);

  // Wait for useEffect to avoid route change during render
  useEffect(() => {
    manager.publish();
  }, [manager]);

  return (
    <QueryParamContext.Provider value={manager}>
      {children}
    </QueryParamContext.Provider>
  )
}

export const useQueryState = <T extends Serializable>(name: string): [T, (value: T) => void] => {
  const manager = useContext(QueryParamContext);

  if (manager === null) {
    throw new Error('Cannot use query state outside of provider');
  }

  if (!manager.has(name)) {
    debugger;
    throw new Error(`Query param "${name}" has not been configured in the provider`);
  }

  return useMemo(
    () => [manager.get(name), (value: Serializable) => manager.set(name, value)],
    [manager, name]
  );
}
