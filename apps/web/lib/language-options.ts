export type SupportedLanguageOption = {
  id: string;
  label: string;
  shortLabel: string;
  monacoLanguage: string;
  starterCode: string;
};

export const defaultLanguageId = "cpp17";

export const supportedLanguages = [
  {
    id: "cpp17",
    label: "C++17 (GNU g++)",
    shortLabel: "C++17",
    monacoLanguage: "cpp",
    starterCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  long long a, b;
  cin >> a >> b;
  cout << a + b << '\\n';
  return 0;
}
`,
  },
  {
    id: "cpp20",
    label: "C++20 (GNU g++)",
    shortLabel: "C++20",
    monacoLanguage: "cpp",
    starterCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  long long a, b;
  cin >> a >> b;
  cout << a + b << '\\n';
  return 0;
}
`,
  },
  {
    id: "cpp23",
    label: "C++23 (GNU g++)",
    shortLabel: "C++23",
    monacoLanguage: "cpp",
    starterCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  long long a, b;
  cin >> a >> b;
  cout << a + b << '\\n';
  return 0;
}
`,
  },
  {
    id: "c11",
    label: "C11 (GCC)",
    shortLabel: "C11",
    monacoLanguage: "c",
    starterCode: `#include <stdio.h>

int main(void) {
  long long a, b;
  scanf("%lld %lld", &a, &b);
  printf("%lld\\n", a + b);
  return 0;
}
`,
  },
  {
    id: "c17",
    label: "C17 (GCC)",
    shortLabel: "C17",
    monacoLanguage: "c",
    starterCode: `#include <stdio.h>

int main(void) {
  long long a, b;
  scanf("%lld %lld", &a, &b);
  printf("%lld\\n", a + b);
  return 0;
}
`,
  },
  {
    id: "python3",
    label: "Python 3",
    shortLabel: "Python 3",
    monacoLanguage: "python",
    starterCode: `import sys

data = list(map(int, sys.stdin.read().split()))
print(data[0] + data[1])
`,
  },
  {
    id: "pypy3",
    label: "PyPy 3",
    shortLabel: "PyPy 3",
    monacoLanguage: "python",
    starterCode: `import sys

data = list(map(int, sys.stdin.read().split()))
print(data[0] + data[1])
`,
  },
  {
    id: "java17",
    label: "Java",
    shortLabel: "Java",
    monacoLanguage: "java",
    starterCode: `import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.StringTokenizer;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    long a = Long.parseLong(st.nextToken());
    long b = Long.parseLong(st.nextToken());
    System.out.println(a + b);
  }
}
`,
  },
  {
    id: "kotlin",
    label: "Kotlin",
    shortLabel: "Kotlin",
    monacoLanguage: "kotlin",
    starterCode: `fun main() {
    val nums = generateSequence(::readLine)
        .flatMap { it.trim().split(Regex("\\\\s+")).asSequence() }
        .filter { it.isNotEmpty() }
        .map { it.toLong() }
        .toList()
    println(nums[0] + nums[1])
}
`,
  },
  {
    id: "golang",
    label: "Golang",
    shortLabel: "Golang",
    monacoLanguage: "go",
    starterCode: `package main

import "fmt"

func main() {
  var a, b int64
  fmt.Scan(&a, &b)
  fmt.Println(a + b)
}
`,
  },
  {
    id: "rust",
    label: "Rust",
    shortLabel: "Rust",
    monacoLanguage: "rust",
    starterCode: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut nums = input.split_whitespace().map(|x| x.parse::<i64>().unwrap());
    let a = nums.next().unwrap();
    let b = nums.next().unwrap();
    println!("{}", a + b);
}
`,
  },
  {
    id: "nodejs20",
    label: "JavaScript (Node.js)",
    shortLabel: "Node.js",
    monacoLanguage: "javascript",
    starterCode: `const fs = require("fs");

const [a, b] = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
console.log(a + b);
`,
  },
  {
    id: "ruby33",
    label: "Ruby",
    shortLabel: "Ruby",
    monacoLanguage: "ruby",
    starterCode: `a, b = STDIN.read.split.map(&:to_i)
puts a + b
`,
  },
  {
    id: "php83",
    label: "PHP",
    shortLabel: "PHP",
    monacoLanguage: "php",
    starterCode: `<?php
$data = preg_split('/\\s+/', trim(stream_get_contents(STDIN)));
echo ((int) $data[0] + (int) $data[1]) . PHP_EOL;
`,
  },
] satisfies SupportedLanguageOption[];

export function getSupportedLanguage(languageId: string) {
  return supportedLanguages.find((language) => language.id === languageId) ?? supportedLanguages[0];
}

export function starterCodeForLanguage(languageId: string) {
  return getSupportedLanguage(languageId).starterCode;
}

export function displayLanguageName(languageId: string) {
  return getSupportedLanguage(languageId).shortLabel;
}
