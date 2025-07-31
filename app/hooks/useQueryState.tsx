"use client";

import { createContext, FC, ReactNode, useContext, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type Serializable = string | number | boolean | object;
export type DefaultValueOrGetter<T> = T | (() => T);
export type QueryParamConfig<T extends Serializable> = Record<string, DefaultValueOrGetter<T>>;

type ChangePublishStrategy = 'none' | 'push' | 'replace';

class QueryParamManager {
  public static extractDefault = <T extends Serializable>(defaultValueOrGetter: T | (() => T)) => {
    const isGetter = typeof defaultValueOrGetter === 'function';

    if (isGetter) {
      return (defaultValueOrGetter as () => T)();
    } else {
      return defaultValueOrGetter;
    }
  }

  private serialize: <V>(value: V) => string;
  private deserialize: <V>(stringValue: string) => V;
  private push: (path: string) => void;
  private replace: (path: string) => void;
  private searchParams: URLSearchParams;
  private parsedValues: Map<string, Serializable>;
  private pathname: string;

  public isDirty: boolean;

  constructor(
    config: QueryParamConfig<Serializable>,
    pathname: string,
    searchParams: URLSearchParams,
    push: (path: string) => void,
    replace: (path: string) => void,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  ) {
    this.serialize = serialize;
    this.deserialize = deserialize;
    this.push = push;
    this.replace = replace;
    this.searchParams = searchParams;
    this.parsedValues = new Map<string, Serializable>();
    this.pathname = pathname;
    this.isDirty = false;

    for (const [name, defaultValueOrGetter] of Object.entries(config)) {
      this.isDirty = this.configure(name, defaultValueOrGetter, 'none');
    }
  }

  // @return Whether or not the URL state is dirty after configuration
  public configure<T extends Serializable>(
    name: string,
    defaultValueOrGetter: DefaultValueOrGetter<T>,
    publishStrategy: ChangePublishStrategy,
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

    this.set(name, value, publishStrategy);

    if (!requestedValue) {
      return true;
    } else {
      return false;
    }
  }

  public handleChange(strategy: ChangePublishStrategy = 'push') {
    if (strategy === 'none') {
      this.isDirty = true;
    } else {
      this.isDirty = false;

      if (strategy === 'push') {
        this.push(this.getPath());
      } else {
        this.replace(this.getPath());
      }
    }
  }

  public syncCurrentURL(strategy: ChangePublishStrategy = 'push') {
    this.handleChange(strategy);
  }

  public set<T extends Serializable>(key: string, value: T, publishStrategy: ChangePublishStrategy = 'push') {
    if (this.parsedValues.get(key) !== value) {
      this.parsedValues.set(key, value);
      this.searchParams.set(key, this.serialize(value));

      this.handleChange(publishStrategy);
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
    router.replace,
  ), [config, pathname, router.push, router.replace, searchParams]);

  // Wait for useEffect to avoid route change during render
  useEffect(() => {
    // Replace to allow going back - otherwise will return to previous state w/missing params,
    // which will then be automatically set, preventing the user from actually going back
    manager.syncCurrentURL('replace');
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
